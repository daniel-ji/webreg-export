// routes/index.js
const fs = require('fs');

const express = require('express');
const router = express.Router();

const multer = require('multer');

const parseHTML = require('../config/parse/parseHTML');
const constants = require('../config/parse/constants');

// Import quarter management modules
const {
	getAvailableQuarters,
	getAllQuarters,
	initializeQuarters
} = require('../config/quarterManager');
const { getQuarterAcademicEvents } = require('../config/academicCalendarService');

// Initialize quarters file on startup
initializeQuarters().catch(err => {
	console.error('Failed to initialize quarters:', err);
});

// multer storage for uploaded schedule photos
const storage = multer.diskStorage({
	destination: './tmp/uploads',
	filename: (req, file, cb) => {
		try {
			const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
			cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.mimetype.split('/')[1])
		} catch (err) {
			console.log(err);
		}
	}
})

// multer upload object with limit config and file filter to prevent unwanted uploads
const upload = multer({
	storage: storage,
	limits: {
		fields: 25,
		fileSize: 10000000,
		files: 5,
	},
	fileFilter: (req, file, cb) => {
		const ua = req.headers['user-agent'];
		console.log('User Agent: ' + ua);
		console.log('Mimetype: ' + file.mimetype);;
		if (req.path === '/converthtml' && (file.mimetype === 'text/html'
			|| (file.mimetype === 'application/octet-stream' && file.originalname.endsWith('.webarchive')))) {
			return cb(null, true);
		}

		return cb(null, false);
	}
})

/* GET home page. */
router.get('/', (req, res, next) => {
	return res.sendStatus(200);
});

/**
 * GET /quarters - Returns available quarters with default selection
 */
router.get('/quarters', async (req, res) => {
	try {
		const quartersData = await getAvailableQuarters();
		return res.json(quartersData);
	} catch (error) {
		console.error('Error fetching quarters:', error);
		return res.status(500).json({ message: 'Failed to load academic quarters' });
	}
});

/**
 * GET /academic-calendar/:quarter - Get academic calendar events for a quarter
 */
router.get('/academic-calendar/:quarter', async (req, res) => {
	try {
		const quarterKey = req.params.quarter;
		const quarters = await getAllQuarters();

		if (!quarters[quarterKey]) {
			return res.status(400).json({
				message: `Invalid quarter: ${quarterKey}`
			});
		}

		const events = await getQuarterAcademicEvents(quarterKey, quarters[quarterKey]);
		return res.json({ events });
	} catch (error) {
		console.error('Error fetching academic calendar:', error);
		return res.status(500).json({
			message: 'Failed to fetch academic calendar events'
		});
	}
});

/**
 * POST /converthtml - Convert HTML schedule to ICS format
 * Returns JSON: { events: [...], warnings: [...] }
 */
router.post('/converthtml', upload.single('html'), async (req, res, next) => {
	// REQ-2: Check file exists BEFORE accessing properties
	if (!req.file) {
		return res.status(400).json({ message: 'No file uploaded. Please upload your WebReg schedule.' });
	}

	console.log(req.file.size / 1000 + ' KB');

	// Delete file after 10 seconds
	setTimeout(() => {
		fs.unlink(req.file.path, (err) => {
			if (err) {
				console.log(err);
			}
		});
	}, 10000);

	// Track warnings for partial failures
	const warnings = [];

	// Get all quarters (dynamic + static)
	let quarters;
	try {
		quarters = await getAllQuarters();
	} catch (error) {
		console.error('Error loading quarters:', error);
		// Fallback to static quarters
		quarters = constants.academicQuarters;
		warnings.push('Using cached quarter data');
	}

	// REQ-4: Specific error messages for invalid quarter
	if (!req.body.quarter) {
		return res.status(400).json({ message: 'No quarter selected. Please select an academic quarter.' });
	}

	if (!quarters[req.body.quarter]) {
		return res.status(400).json({
			message: `Invalid quarter: "${req.body.quarter}". Please select a valid academic quarter.`
		});
	}

	const quarterData = quarters[req.body.quarter];

	// Parse the schedule
	try {
		const html = fs.readFileSync(req.file.path, 'utf8');

		let text;
		try {
			text = parseHTML.getText(html);
		} catch (error) {
			console.log(error);
			return res.status(500).json({ message: error.message });
		}

		// Get ICS events with dynamic quarter data
		const events = parseHTML.getICS(text, req.body.quarter, false, quarterData);

		// REQ-8: Include academic calendar events if requested
		if (req.body.includeAcademicCalendar === 'true') {
			try {
				const academicEvents = await getQuarterAcademicEvents(req.body.quarter, quarterData);
				events.push(...academicEvents);
			} catch (error) {
				console.error('Failed to fetch academic calendar:', error);
				warnings.push('Could not fetch academic calendar events');
			}
		}

		// REQ-3: Return proper JSON structure, not double-encoded string
		return res.json({ events, warnings });
	} catch (error) {
		console.log(error);
		return res.status(500).json({ message: 'Server error when creating schedule. Please try again later.' });
	}
});

module.exports = router;
