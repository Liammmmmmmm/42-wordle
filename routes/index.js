const express = require('express');
const { getWordleStats, getPersoStats } = require('../controllers/wordle');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
	const login_url = `https://api.intra.42.fr/oauth/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${process.env.APP_URL}/auth/redirection&response_type=code&scope=public&state=${process.env.FTAPI_STATE}`;
	let data = null;
	const token = req.cookies?.jwt;	
	if (token) {
		try {
			const decoded = jwt.verify(token, process.env.JWT_SECRET);
			const userId = decoded.id;
			db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
				if (!err && row) data = row;
				res.render('home', {
					user_data: data,
					login_url: login_url,
					locale: req.getLocale(),
					__: res.__
				});
			});
		} catch (e) {
			res.render('home', {
				user_data: null,
				login_url: login_url,
				locale: req.getLocale(),
				__: res.__
			});
		}
	} else {
		res.render('home', {
			user_data: null,
			login_url: login_url,
			locale: req.getLocale(),
			__: res.__
		});
	}
});

function is_logged_in(req) {
	const token = req.cookies?.jwt;
	if (!token) return false;
	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		return !!decoded.id;
	} catch (e) {
		return false;
	}
}

router.get('/wordle', (req, res) => {
	if (!is_logged_in(req)) return res.redirect("/");

	const token = req.cookies?.jwt;

	getWordleStats((err, stats) => {
		if (err) {
			return res.render('wordle', {
				leaderboards: null,
				stats: null,
				__: res.__
			});
		}
		getPersoStats(token, (err2, persoStats) => {
			res.render('wordle', {
				leaderboards: stats,
				stats: err2 ? null : persoStats,
				__: res.__
			});
		});
	});
});


module.exports = router;
