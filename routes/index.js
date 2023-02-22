const fs = require('fs');

const express = require('express');
const router = express.Router();

const multer  = require('multer');

const parseImage = require('../config/ocr/parseImage');
const parseAnnotation = require('../config/ocr/parseAnnotation');
const constants = require('../config/ocr/constants');

// accepted image and pdf types, pdf not yet implemented (also may not be removed in the future)
const ACCEPTED_IMAGETYPE = ['image/png', 'image/jpeg']
const ACCEPTED_PDFTYPE = ['application/pdf']

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

		if (req.path === '/convertpdf' && ACCEPTED_PDFTYPE.includes(file.mimetype)) {
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
router.get('/logout', (req, res, next) => {
	req.logOut((err) => {
		if (err) return res.sendStatus(500);
		res.redirect('/')
	});
})

// convert image to ICS, returns 400 if no image or quarter is provided, 500 if error occurs
router.post('/convertimage', upload.single('image'), (req, res, next) => {
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
		parseImage.getText(req.file.path).then(result => {
			// return 200 with ICS data as a stringify'd JSON object
			return res.json(JSON.stringify(parseAnnotation.getICS(result, req.body.quarter)))
		})
	} catch (error) {
		console.log(error);
		return res.sendStatus(500);
	}
})

// convert pdf to ICS, not yet implemented
router.post('/convertpdf', upload.single('pdf'), (req, res, next) => {
	if (!req.file) {
		return res.sendStatus(400);
	}

	return res.sendStatus(501);
})

module.exports = router;
