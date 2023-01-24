const express = require('express');
const router = express.Router();

const passport = require('passport')

const multer  = require('multer');
const app = require('../app');
const ACCEPTED_IMAGETYPE = ['image/png', 'image/jpeg']
const ACCEPTED_PDFTYPE = ['application/pdf']
const TEST_DATA = {
	class0: {
		day: "MWF",
		timeStart: [10, 0],
		timeFinish: [10, 50],
		className: "CSE 15L",
		classTitle: "Software Tools & Techniques Lab",
		classType: "LE",
		sectionNumber: "BO7",
		professor: "Politz, Joseph Gibbs",
		location: "PETER 108",
		gradeOption: "L",
		units: 2
	},
	class1: {
		day: "tuesday",
		timeStart: [8, 0],
		timeFinish: [9, 20],
		className: "CSE 20",
		classTitle: "Discrete Mathematics",
		classType: "LE",
		sectionNumber: "A01",
		professor: "Jones, Miles E",
		location: "WLH 2001",
		gradeOption: "L",
		units: 4
	}
};
const ICS_TEST_DATA = [
	{
		start: [2023, 1, 9, 10, 0],
		duration: {hours: 0, minutes: 50},
		title: 'CSE 15L',
		description: 
`CSE 15L, Software Tools&Techniques Lab
Politz, Joseph Gibbs
PETER 108
Class Type: LE
Section B07
Grade Option: L, Units: 2`,
		location: 'PETER 108',
		recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,WE;INTERVAL=1'
	},
	{
		start: [2023, 1, 10, 8, 0],
		duration: {hours: 1, minutes: 20},
		title: 'CSE 20',
		description: 
`CSE 20, Discrete Mathematics
Jones, Miles E
WLH 2001
Class Type: LE
Section A01
Grade Option: L, Units: 4`,
		location: 'WLH 2001',
		recurrenceRule: 'FREQ=WEEKLY;BYDAY=TU,TH;INTERVAL=1'
	}
]

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

router.get('/logout', (req, res, next) => {
	req.logOut((err) => {
		if (err) return res.sendStatus(500);
		res.redirect('/')
	});
})

router.post('/convertimage', upload.single('image'), (req, res, next) => {
	if (!req.file) {
		return res.sendStatus(400);
	}

	return res.json(JSON.stringify(ICS_TEST_DATA))
})

router.post('/convertpdf', upload.single('pdf'), (req, res, next) => {
	if (!req.file) {
		return res.sendStatus(400);
	}

	return res.json(JSON.stringify(ICS_TEST_DATA))
})

router.get('/auth/google', passport.authenticate('google', {
	scope: ['email', 'profile']
}))

router.get('/auth/google/callback',
    passport.authenticate( 'google', {
        successRedirect: '/auth/google/success',
        failureRedirect: '/auth/google/failure'
}));

router.get('/auth/google/success', (req, res, next) => {
	return res.sendStatus(200);
})

router.get('/auth/google/failure', (req, res, next) => {
	return res.sendStatus(200);
})

module.exports = router;
