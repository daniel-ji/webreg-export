const fs = require('fs');

const express = require('express');
const router = express.Router();

const multer = require('multer');

const parseImage = require('../config/parseImage');
const parseHTML = require('../config/parseHTML');
const constants = require('../config/constants');

// accepted types
const ACCEPTED_IMAGETYPE = ['image/png', 'image/jpeg']
const ACCEPTED_HTMLTYPE = ['text/html']

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
		if (req.path === '/convertimage' && ACCEPTED_IMAGETYPE.includes(file.mimetype)) {
			return cb(null, true);
		}

		if (req.path === '/converthtml' && ACCEPTED_HTMLTYPE.includes(file.mimetype)) {
			return cb(null, true);
		}

		return cb(null, false);
	}
})

/* GET home page. */
router.get('/', (req, res, next) => {
	return res.sendStatus(200);
});

// log out user, for passport / google oauth, partially implemented
// router.get('/logout', (req, res, next) => {
// 	req.logOut((err) => {
// 		if (err) return res.sendStatus(500);
// 		res.redirect('/')
// 	});
// })

// convert image to ICS, returns 400 if no image file or quarter is provided, 500 if error occurs
router.post('/convertimage', upload.single('image'), async (req, res, next) => {
	delayedDeleteFile(req.file);

	// if no file or invalid quarter, invalid request, return 400
	if (!req.file || !Object.keys(constants.academicQuarters).includes(req.body.quarter)) {
		return res.sendStatus(400);
	}

	// try to parse image, if error occurs, return 500
	try {
		const text = await parseImage.getText(req.file.path);
		return res.json(JSON.stringify(parseImage.getICS(text, req.body.quarter)))
	} catch (error) {
		console.log(error);
		return res.sendStatus(500);
	}
})


// convert html to ICS, returns 400 if no html file or quarter is provided, 500 if error occurs
router.post('/converthtml', upload.single('html'), (req, res, next) => {
	delayedDeleteFile(req.file);

	// if no file or invalid quarter, invalid request, return 400
	if (!req.file || !Object.keys(constants.academicQuarters).includes(req.body.quarter)) {
		return res.sendStatus(400);
	}

	// try to parse html, if error occurs, return 500
	try {
		const html = fs.readFileSync(req.file.path, 'utf8');
		const text = parseHTML.getText(html);
		return res.json(JSON.stringify(parseHTML.getICS(text, req.body.quarter)))
	} catch (error) {
		console.log(error);
		return res.sendStatus(500);
	}
})

// delete file after 20 seconds
const delayedDeleteFile = (file) => {
	if (file) {
		setTimeout(() => {
			fs.unlink(file.path, (err) => {
				if (err) {
					console.log(err);
				}
			});
		}, 20000)
	}
}

module.exports = router;
