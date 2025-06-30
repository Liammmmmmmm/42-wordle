const express = require('express');
const { getWordleStats, getPersoStats, getAvailableDates, getArchiveByDate } = require('../controllers/wordle');
const jwt = require('jsonwebtoken');
const db = require('../db');
const wordleController = require('../controllers/wordle');

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
					if (!user) {
						return res.render('wordle', {
							leaderboards: stats,
							stats: err2 ? null : persoStats,
							userLogin: null,
							mode: gameMode,
							__: res.__
						});
					}
					const login = user.login;
					const wordleController = require('../controllers/wordle');
					wordleController.getUserStreak(login, (errStreak, streak) => {
						res.render('wordle', {
							leaderboards: stats,
							stats: err2 ? null : persoStats,
							userLogin: login,
							mode: gameMode,
							streak: streak || { currentStreak: 0, bestStreak: 0 },
							__: res.__
						});
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

router.get('/archives', (req, res) => {
	if (!is_logged_in(req)) return res.redirect("/");

	const selectedDate = req.query.date;

	getAvailableDates((err, availableDates) => {
		if (err) {
			console.error('Error fetching available dates:', err);
			return res.render('archives', {
				availableDates: [],
				selectedArchive: null,
				error: 'Erreur lors du chargement des archives',
				locale: req.getLocale(),
				__: res.__,
				topStreaks: []
			});
		}

		let dateToLoad = selectedDate;
		if (!dateToLoad && availableDates.length > 0) {
			dateToLoad = availableDates[0].date;
		}

		if (!dateToLoad) {
			return wordleController.getTopStreaks((errTop, topStreaks) => {
				res.render('archives', {
					availableDates: [],
					selectedArchive: null,
					selectedDate: null,
					locale: req.getLocale(),
					__: res.__,
					topStreaks: topStreaks || []
				});
			});
		}

		getArchiveByDate(dateToLoad, (err, archive) => {
			if (err) {
				return wordleController.getTopStreaks((errTop, topStreaks) => {
					res.render('archives', {
						availableDates,
						selectedArchive: null,
						selectedDate: dateToLoad,
						error: 'Erreur lors du chargement de l\'archive',
						locale: req.getLocale(),
						__: res.__,
						topStreaks: topStreaks || []
					});
				});
			}

			const token = req.cookies?.jwt;
			let userId = null;
			if (token) {
				try {
					const decoded = jwt.verify(token, process.env.JWT_SECRET);
					userId = decoded.id;
				} catch (e) {
					console.error('JWT verification failed:', e);
				}
			}
			if (userId) {
				const now = new Date();
				const dd = String(now.getDate()).padStart(2, "0");
				const mm = String(now.getMonth() + 1).padStart(2, "0");
				const yyyy = now.getFullYear();
				const wordle = `${dd}-${mm}-${yyyy}`;

				db.get('SELECT wp.* FROM wordle_participations wp JOIN users u ON wp.login = u.login WHERE wp.wordle = ? AND u.id = ?', [wordle, userId], (err, row) => {
					if (err || !row) {
						archive.wordOfTheDay = "HIDDEN WORD"
					}
					wordleController.getTopStreaks((errTop, topStreaks) => {
						res.render('archives', {
							availableDates,
							selectedArchive: archive,
							selectedDate: dateToLoad,
							locale: req.getLocale(),
							__: res.__,
							topStreaks: topStreaks || []
						});
					});
				});
				return;
			}
			wordleController.getTopStreaks((errTop, topStreaks) => {
				res.render('archives', {
					availableDates,
					selectedArchive: archive,
					selectedDate: dateToLoad,
					locale: req.getLocale(),
					__: res.__,
					topStreaks: topStreaks || []
				});
			});
		});
	});
});

module.exports = router;
