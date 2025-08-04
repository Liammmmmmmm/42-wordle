const express = require("express");
const path = require('path');
const mysql = require("mysql");
const dotenv = require('dotenv');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const i18n = require('i18n');
const hbs = require('hbs');

const app = express();

dotenv.config({ path: './.env' });

app.use(cookieParser());
const http = require("http").createServer(app);

const publicDirectory = path.join(__dirname, './public');
app.use(express.static(publicDirectory));

i18n.configure({
	locales: ['en', 'fr', 'jp', 'anc-gr', 'ru', 'hindi', 'ch-tr', 'cor', 'espe', 'mini', 'klin'],
	directory: path.join(__dirname, 'locales'),
	defaultLocale: 'en',
	cookie: 'lang',
	queryParameter: 'lang'
});

app.use((req, res, next) => {
	if (req.query.lang) {
		res.cookie('lang', req.query.lang, { maxAge: 900000, httpOnly: false });
	}
	next();
});

app.use(i18n.init);

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// exports.io = io;

hbs.registerHelper('__', function () {
    return i18n.__.apply(this, arguments);
});
hbs.registerHelper('eqs', function(a, b, options) {
  return a === b ? options.fn(this) : options.inverse(this);
});
hbs.registerHelper('eq', function(a, b) {
	return a === b;
});
hbs.registerHelper('gt', function(a, b) {
	return a > b;
});
hbs.registerHelper('inc', function(value) {
  return parseInt(value) + 1;
});

app.set('view engine', 'hbs');

// require('./socket/...');

const players = {};

app.use('/', require('./routes/index'));
app.use('/api/wordle', require('./routes/wordle')(players));
app.use('/auth', require('./routes/auth'));


app.use(function (req, res, next) {
	res.status(404);

	res.format({
		html: function () {
			res.render('404', { url: req.url });
		},
		json: function () {
			res.json({ error: 'Not found' });
		},
		default: function () {
			res.type('txt').send('Not found');
		}
	})
});

const PORT = 3000

switch (process.env.APP_STATUS) {
	case 'DEV':
		http.listen(PORT, () => {
			console.log("http://localhost:" + PORT);
		});
		break;

	case 'PROD':
		http.listen();
		break;

	default:
		console.error(`APP_STATUS: ${process.env.APP_STATUS}`)
}
