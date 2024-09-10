const fs = require('fs');

const express = require('express');
const router = express.Router();

const multer = require('multer');

const parseHTML = require('../config/parse/parseHTML');
const constants = require('../config/parse/constants');

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

// convert html to ICS, returns 400 if no image or quarter is provided, 500 if error occurs
router.post('/converthtml', upload.single('html'), (req, res, next) => {
	console.log(req.file.size / 1000 + ' KB');
	// delete file after 10 seconds
	if (req.file) {
		setTimeout(() => {
			fs.unlink(req.file.path, (err) => {
				if (err) {
					console.log(err);
				}
			});
		}, 10000)
	}

	// if no file or invalid quarter, invalid request, return 400
	if (!req.file || !Object.keys(constants.academicQuarters).includes(req.body.quarter)) {
		return res.sendStatus(400);
	}

	// try to parse image, if error occurs, return 500
	try {
		const html = fs.readFileSync(req.file.path, 'utf8');

		let text;
		try {
			text = parseHTML.getText(html);
		} catch (error) {
			console.log(error);
			return res.status(500).send(error.message);
		}
		return res.json(JSON.stringify(parseHTML.getICS(text, req.body.quarter)))
	} catch (error) {
		console.log(error);
		return res.status(500).send('Server error when creating schedule. Please try again later.');
	}
})

module.exports = router;
