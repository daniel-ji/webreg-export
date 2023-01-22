var express = require('express');
var router = express.Router();

const multer  = require('multer');
const ACCEPTED_IMAGETYPE = ['image/png', 'image/jpeg']
const ACCEPTED_PDFTYPE = ['application/pdf']

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

router.post('/convertimage', upload.single('image'), (req, res, next) => {
	if (!req.file) {
		return res.sendStatus(400);
	}

	return res.sendStatus(200);
})

router.post('/convertpdf', upload.single('pdf'), (req, res, next) => {
	if (!req.file) {
		return res.sendStatus(400);
	}

	return res.sendStatus(200);
})

module.exports = router;
