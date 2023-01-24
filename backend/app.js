
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const session = require('express-session')
const authFunctions = require('./config/authFunctions');
const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth2').Strategy;

const cors = require('cors');
const hpp = require('hpp');
const helmet = require('helmet');
require('dotenv').config()

const indexRouter = require('./routes/index');

const app = express();

// Helmet
app.use(helmet());
// HPP
app.use(hpp());

// CORS
const corsOptions = {
		origin: 'http://localhost:3000',
		credentials: true
};
app.use(cors(corsOptions));

// Express Session
app.use(session({
    secret: process.env.EXPRESS_SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 60 * 60 * 1000
    }
}))

// Passport
app.use(passport.initialize());
app.use(passport.session())

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:8000/auth/google/callback",
    passReqToCallback: true
}, authFunctions.verify))

passport.serializeUser(authFunctions.serializeUser)
passport.deserializeUser(authFunctions.deserializeUser)

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	res.sendStatus(400);
});

module.exports = app;
