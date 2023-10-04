/**
 * Auth Routes, uses passport.js and Google OAuth2.0. Not yet implemented.
 */

const express = require('express');
const router = express.Router();

const passport = require('passport')

router.get('/google', passport.authenticate('google', {
	scope: ['email', 'profile']
}))

router.get('/google/callback',
    passport.authenticate( 'google', {
        successRedirect: '/auth/google/success',
        failureRedirect: '/auth/google/failure'
}));

router.get('/google/success', (req, res, next) => {
	return res.sendStatus(200);
})

router.get('/google/failure', (req, res, next) => {
	return res.sendStatus(200);
})

module.exports = router;