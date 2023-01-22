const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const hpp = require('hpp');
const helmet = require('helmet');

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
