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
					__: res.__
				});
			});
		} catch (e) {
			res.render('home', {
				user_data: null,
				login_url: login_url,
				__: res.__
			});
		}
	} else {
		res.render('home', {
			user_data: null,
			login_url: login_url,
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
	const mode = req.query.mode || 'normal';

	const gameMode = ['normal', 'hard'].includes(mode) ? mode : 'normal';

	getWordleStats((err, stats) => {
		if (err) {
			return res.render('wordle', {
				leaderboards: null,
				stats: null,
				mode: gameMode,
				__: res.__
			});
		}
		getPersoStats(token, (err2, persoStats) => {
			try {
				const decoded = jwt.verify(token, process.env.JWT_SECRET);
				db.get('SELECT login FROM users WHERE id = ?', [decoded.id], (err, user) => {
					res.render('wordle', {
						leaderboards: stats,
						stats: err2 ? null : persoStats,
						userLogin: user ? user.login : null,
						mode: gameMode,
						__: res.__
					});
				});
			} catch (e) {
				res.render('wordle', {
					leaderboards: stats,
					stats: err2 ? null : persoStats,
					userLogin: null,
					mode: gameMode,
					__: res.__
				});
			}
		});
	});
});

module.exports = router;
