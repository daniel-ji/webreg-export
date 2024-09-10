const fs = require('fs');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const session = require('cookie-session')

const rateLimit = require('express-rate-limit')
const cors = require('cors');
const hpp = require('hpp');
const helmet = require('helmet');
require('dotenv').config()

const indexRouter = require('./routes/index');

const app = express();

// Initialization
fs.rmSync('./tmp/uploads', { recursive: true, force: true })
fs.mkdirSync('./tmp/uploads')

// Rate Limiting
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})
app.use(limiter)

// Helmet
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
    directives: {
        "img-src": ["'self'", "blob: data:"],
    }
}))
// HPP
app.use(hpp());

// CORS
const corsOptions = {
		origin: process.env.NODE_ENV === "production" ? undefined : 'http://localhost:3000',
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

// default expres-generator middleware setup
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// routes
app.use('/api', indexRouter);

// serve frontend website static assets if in production / staging
if (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "staging") {
    app.use(express.static(path.join(__dirname, 'frontend/build')))
    app.get("*", (req, res) => {
        res.sendFile(path.join(__dirname, 'frontend/build'));
    });
}   

// catch 404 and forward to error handler
app.use(function(req, res, next) {
	res.sendStatus(400);
});

module.exports = app;
