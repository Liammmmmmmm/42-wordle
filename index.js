const express = require("express");
const path = require('path');
const mysql = require("mysql");
const dotenv = require('dotenv');
const fs = require('fs');


const app = express();

dotenv.config({ path: './.env' });

const http = require("http").createServer(app);

// const io = require("socket.io")(http);

// const db = mysql.createConnection({
//     host: process.env.DATABASE_HOST,
//     user: process.env.DATABASE_USER,
//     password: process.env.DATABASE_PASSWORD,
//     database: process.env.DATABASE
// });

// db.connect((error) => {
//     console.log(`\n${Color.FgWhite}Connection to the database...${Color.Reset}`)
//     if (error) {
//         console.log(error)
//     } else {
//         console.log(`${Color.FgWhite}Connection successful !${Color.Reset}\n`)
//     }
// })


const publicDirectory = path.join(__dirname, './public');
app.use(express.static(publicDirectory));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// exports.io = io;

app.set('view engine', 'hbs');

// require('./socket/...');

app.use('/', require('./routes/index'));
app.use('/api/wordle', require('./routes/wordle'));


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
