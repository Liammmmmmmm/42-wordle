const fs = require("fs");
const db = require('../db');
const jwt = require('jsonwebtoken');
const log = require('../log');

const words = [];
const small_words = [];

const players_data = {};

fs.readFile('./words.txt', 'utf8', (err, data) => {
	if (err) {
		console.error(err);
		return;
	}
	let splitted = data.split("\n");
	splitted.forEach((element) => {
		if (element.length == 5) words.push(element);
	});
	if (words.length == 0) {
		console.error("Invalid word list");
		process.exit();
	}
});

fs.readFile('./small_words.txt', 'utf8', (err, data) => {
	if (err) {
		console.error(err);
		return;
	}
	let splitted = data.split("\n");
	splitted.forEach((element) => {
		if (element.length == 5) small_words.push(element);
	});
	if (small_words.length == 0) {
		console.error("Invalid word list");
		process.exit();
	}
});

function hashString(str) {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = (hash << 5) - hash + str.charCodeAt(i);
		hash |= 0;
	}
	return Math.abs(hash);
}

function getFormatedDate(date = null) {
	const now = date || new Date();
	const yyyy = now.getFullYear();
	const mm = String(now.getMonth() + 1).padStart(2, "0");
	const dd = String(now.getDate()).padStart(2, "0");
	return `${dd}-${mm}-${yyyy}`;
}

function getFormatedDateReverse(date = null) {
	const now = date || new Date();
	const yyyy = now.getFullYear();
	const mm = String(now.getMonth() + 1).padStart(2, "0");
	const dd = String(now.getDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
}

async function getWordOfTheDay(date = null) {
	const dateKey = getFormatedDate(date || new Date());

	return new Promise((resolve, reject) => {
		db.get(`SELECT word FROM word WHERE date = ?`, [dateKey], (err, row) => {
			if (err) return reject(err);
			if (row && row.word) {
				return resolve(row.word);
			} else {
				const saltedDate = `${process.env.SEED}wordle_salt_${dateKey}_random_seed`;
				const index = hashString(saltedDate) % small_words.length;
				const word = small_words[index];
				db.run(`INSERT INTO word (word, date) VALUES (?, ?)`, [word, dateKey], (err) => {
					if (err) return reject(err);
					return resolve(word);
				});
			}
		});
	});
}

exports.validateWord = async (req, res) => {
	const word = req.body?.word?.toLowerCase();
	const players = req.players

	if (!word) return (res.status(400).json({ error: true, details: "Missing parrameter" }));
	if (!words.includes(word)) return (res.status(404).json({ error: true, details: "Invalid word" }));

	const token = req.cookies?.jwt;
	let userId;
	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		userId = decoded.id;
	} catch (err) {
		return res.status(401).json({ error: true, details: "Invalid token" });
	}

	// Vérifier et initialiser les données du joueur de manière atomique
	const currentDate = getFormatedDate();
	
	// Si le joueur a des données d'un jour différent, les reset
	if (players[userId] && players[userId].date !== currentDate) {
		players[userId] = null;
	}

	if (!players[userId] || players[userId].attempts === undefined) {
		log(`VALIDATE_WORD: ${userId} tried a word without starting the game`);
		players[userId] = { 
			start_time: Date.now() - 10 * 1000, 
			attempts: 0, 
			date: currentDate 
		};
	}

	players[userId].attempts++;

	console.log(`VALIDATE_WORD: ${userId}`);
	console.log(players);

	const dayWord = await getWordOfTheDay();

	const validation = ["absent", "absent", "absent", "absent", "absent"];


	const letterCount = {};
	for (let letter of dayWord) {
		letterCount[letter] = (letterCount[letter] || 0) + 1;
	}

	for (let i = 0; i < 5; i++) {
		if (word[i] === dayWord[i]) {
			validation[i] = "correct";
			letterCount[word[i]]--;
		}
	}

	for (let i = 0; i < 5; i++) {
		if (validation[i] === "absent" && letterCount[word[i]] > 0) {
			validation[i] = "present";
			letterCount[word[i]]--;
		}
	}


	log(`VALIDATE_WORD: ${userId} word "${word}" answer "${dayWord}". INFOS: attempts ${players[userId].attempts} time ${Math.floor((Date.now() - players[userId].start_time) / 1000)}s`);

	if (word == dayWord || players[userId].attempts >= 6) {
		const timeToComplete = (Date.now() - players[userId].start_time) / 1000;
		const saveResultsResponse = await saveResults(userId, timeToComplete, players[userId].attempts, word);

		if (saveResultsResponse.error) {
			return res.status(502).json({ error: true, validation: validation, details: saveResultsResponse.details });
		} else {
			return (res.status(200).json({ error: false, validation: validation, time: timeToComplete }));
		}
	} else {
		return (res.status(200).json({ error: false, validation: validation, time: null }));
	}
}

exports.startTyping = async (req, res) => {
	const token = req.cookies?.jwt;
	let userId;
	const players = req.players;

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		userId = decoded.id;
	} catch (err) {
		return res.status(401).json({ error: true, details: "Invalid token" });
	}

	console.log(`START_TYPING: ${userId} started typing`);
	console.log(players);

	const currentDate = getFormatedDate();
	
	if (players[userId] && players[userId].date === currentDate) {
		return res.status(200).json({ error: false, message: "Game already started" });
	}

	log(`START_TYPING: ${userId} started typing`);
	players[userId] = { 
		start_time: Date.now(), 
		attempts: 0, 
		date: currentDate 
	};

	console.log(`Game started for user ${userId} on date ${currentDate}`);
	console.log(players);
	
	return res.status(200).json({ error: false, message: "Game started" });
}

async function saveResults(userId, time, attempts, word) {
	return new Promise(async (resolve, reject) => {
		if (await getWordOfTheDay() != word) attempts = 7;

		if (attempts < 1) attempts = 9999;
		if (time < 1) time = 999999; // 800ms d'animations, impossible de deviner en moins de 200ms donc triche

		const wordle = getFormatedDate();

		log(`SAVE_RESULTS: ${userId} word "${word}" time ${time}s attempts ${attempts} date ${wordle}`);

		db.get(`SELECT login FROM users WHERE id = ?`, [userId], function (err, row) {
			if (err || !row) {
				return resolve({ error: true, details: "User not found" });
			}
			const login = row.login;
			db.get(`SELECT id FROM wordle_participations WHERE login = ? AND wordle = ?`, [login, wordle], function (err, row) {
				if (err) return resolve({ error: true, details: "DB error" });
				if (row) return resolve({ error: true, details: "Already participated today" });
				db.run(`INSERT INTO wordle_participations (login, wordle, time, attempts) VALUES (?, ?, ?, ?)`, [login, wordle, time, attempts], function (err) {
					if (err) return resolve({ error: true, details: "DB error" });
					return resolve({ error: false });
				});
			});
		});
	});
}

exports.getWordleStats = (callback) => {
	const wordle = getFormatedDate();

	const fastestSql = `
		SELECT login, time, attempts FROM wordle_participations
		WHERE wordle = ?
		ORDER BY time ASC, attempts ASC
		LIMIT 10
	`;
	const fewestAttemptsSql = `
		SELECT login, time, attempts FROM wordle_participations
		WHERE wordle = ?
		ORDER BY attempts ASC, time ASC
		LIMIT 10
	`;
	const latestSql = `
		SELECT login, time, attempts, wordle FROM wordle_participations
		WHERE wordle = ?
		ORDER BY id DESC
		LIMIT 10
	`;

	db.all(fastestSql, [wordle], (err, fastest) => {
		if (err) return callback(err);

		db.all(fewestAttemptsSql, [wordle], (err, fewest_attempts) => {
			if (err) return callback(err);

			db.all(latestSql, [wordle], (err, latest) => {
				if (err) return callback(err);

				return callback(null, {
					fastest,
					fewest_attempts,
					latest
				});
			});
		});
	});
};

exports.getPersoStats = (token, callback) => {
	const wordle = getFormatedDate();

	let userId;
	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		userId = decoded.id;
	} catch (err) {
		return callback({ error: true, details: "Invalid token" });
	}

	db.get(`SELECT login FROM users WHERE id = ?`, [userId], function (err, row) {
		if (err || !row) {
			return callback({ error: true, details: "User not found" });
		}
		const login = row.login;
		db.get(`SELECT time, attempts FROM wordle_participations WHERE login = ? AND wordle = ?`,
			[login, wordle],
			function (err, stats) {
				if (err) return callback({ error: true, details: "DB error" });
				if (!stats) return callback(null, null);
				return callback(null, stats);
			}
		);
	});
};

exports.getAvailableDates = (callbackOrReq, res = null) => {
	const callback = res ?
		(err, data) => {
			if (err) return res.status(502).json({ error: true, details: err.message });
			res.status(200).json({ error: false, dates: data });
		} :
		callbackOrReq;

	const distinctDaysSql = `
		SELECT DISTINCT wordle FROM wordle_participations 
		ORDER BY wordle DESC
	`;

	db.all(distinctDaysSql, [], (err, days) => {
		if (err) return callback(err);

		days.sort((a, b) => {
			const [ddA, mmA, yyyyA] = a.wordle.split('-').map(Number);
			const [ddB, mmB, yyyyB] = b.wordle.split('-').map(Number);
			return new Date(yyyyB, mmB - 1, ddB) - new Date(yyyyA, mmA - 1, ddA);
		});

		const dates = days.map(dayRow => {
			const [dd, mm, yyyy] = dayRow.wordle.split('-');
			return {
				date: dayRow.wordle,
				formattedDate: `${dd}/${mm}/${yyyy}`,
				displayDate: `${dd} ${getMonthName(parseInt(mm))} ${yyyy}`
			};
		});

		callback(null, dates);
	});
};

exports.getArchiveByDate = async (dateStringOrReq, callbackOrRes = null, res = null) => {
	let dateString, callback;

	if (typeof dateStringOrReq === 'string') {
		dateString = dateStringOrReq;
		callback = callbackOrRes;
	} else {
		const req = dateStringOrReq;
		dateString = req.params.date;
		callback = (err, data) => {
			if (err) return callbackOrRes.status(502).json({ error: true, details: err.message });
			if (!data) return callbackOrRes.status(404).json({ error: true, details: "Archive not found" });
			callbackOrRes.status(200).json({ error: false, archive: data });
		};
	}

	if (!dateString) {
		return callback(new Error("Date is required"));
	}

	const [dd, mm, yyyy] = dateString.split('-');
	const date = new Date(yyyy, mm - 1, dd);

	if (date > new Date()) return callback(new Error("Cannot fetch archive for a future date"));

	try {
		const wordOfTheDay = await getWordOfTheDay(date);

		const allParticipationsSql = `
			SELECT login, time, attempts FROM wordle_participations
			WHERE wordle = ?
			ORDER BY id ASC
		`;

		db.all(allParticipationsSql, [dateString], (err, allResults) => {
			if (err) return callback(err);

			if (!allResults || allResults.length === 0) {
				return callback(null, {
					date: dateString,
					formattedDate: `${dd}/${mm}/${yyyy}`,
					displayDate: `${dd} ${getMonthName(parseInt(mm))} ${yyyy}`,
					wordOfTheDay: wordOfTheDay.toUpperCase(),
					stats: {
						fastest: [],
						fewest_attempts: [],
						allPlayers: [],
						successCount: 0,
						failureCount: 0,
						averageTime: 0,
						averageAttempts: 0
					},
					totalPlayers: 0
				});
			}

			const successes = allResults.filter(r => r.attempts !== 7);
			const failures = allResults.filter(r => r.attempts === 7);

			const fastestResults = [
				...successes.sort((a, b) => a.time - b.time),
				...failures.sort((a, b) => a.time - b.time)
			];

			const fewestAttemptsResults = [...allResults].sort((a, b) => {
				if (a.attempts !== b.attempts) {
					return a.attempts - b.attempts;
				}
				return a.time - b.time;
			});

			const successCount = successes.length;
			const failureCount = failures.length;
			const averageTime = successes.length > 0
				? (successes.reduce((sum, r) => sum + parseFloat(r.time), 0) / successes.length).toFixed(1)
				: "0";
			const averageAttempts = successes.length > 0
				? (successes.reduce((sum, r) => sum + parseInt(r.attempts), 0) / successes.length).toFixed(1)
				: "0";

			const archive = {
				date: dateString,
				formattedDate: `${dd}/${mm}/${yyyy}`,
				displayDate: `${dd} ${getMonthName(parseInt(mm))} ${yyyy}`,
				wordOfTheDay: wordOfTheDay.toUpperCase(),
				stats: {
					fastest: fastestResults.map((result, index) => ({
						...result,
						rank: index + 1,
						time: parseFloat(result.time).toFixed(1)
					})),
					fewest_attempts: fewestAttemptsResults.map((result, index) => ({
						...result,
						rank: index + 1,
						time: parseFloat(result.time).toFixed(1)
					})),
					allPlayers: allResults.map(result => ({
						...result,
						time: parseFloat(result.time).toFixed(1)
					})),
					successCount,
					failureCount,
					averageTime,
					averageAttempts
				},
				totalPlayers: allResults.length
			};

			callback(null, archive);
		});
	} catch (error) {
		callback(error);
	}
};

function getMonthName(monthNum) {
	const months = [
		'', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
		'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
	];
	return months[monthNum] || 'Mois inconnu';
}

/**
 * Récupère les participations d'un joueur et calcule le streak actuel et le meilleur streak.
 * @param {string} login - Le login de l'utilisateur
 * @param {function} callback - callback(err, { currentStreak, bestStreak, lastParticipationDate })
 */
exports.getUserStreak = function(login, callback) {
	const sql = `
		SELECT wordle FROM wordle_participations
		WHERE login = ?
		ORDER BY wordle ASC
	`;
	db.all(sql, [login], (err, rows) => {
		if (err) return callback(err);

		if (!rows || rows.length === 0) {
			return callback(null, { currentStreak: 0, bestStreak: 0, lastParticipationDate: null });
		}

		const dates = rows.map(r => {
			const [dd, mm, yyyy] = r.wordle.split('-');
			return new Date(`${yyyy}-${mm}-${dd}`);
		}).sort((a, b) => a - b);

		let bestStreak = 1;
		let streak = 1;

		for (let i = 1; i < dates.length; i++) {
			const prev = dates[i - 1];
			const curr = dates[i];
			const diff = (curr - prev) / (1000 * 60 * 60 * 24);
			if (diff === 1) {
				streak++;
			} else if (diff > 1) {
				streak = 1;
			}
			if (streak > bestStreak) bestStreak = streak;
		}

		let currentStreak = 1;
		const today = new Date();
		today.setHours(0,0,0,0);
		let idx = dates.length - 1;
		let last = new Date(dates[idx]);
		last.setHours(0,0,0,0);

		const diffWithToday = (today - last) / (1000 * 60 * 60 * 24);

		if (diffWithToday === 0) {
			while (idx > 0) {
				const prev = new Date(dates[idx - 1]);
				prev.setHours(0,0,0,0);
				const curr = new Date(dates[idx]);
				curr.setHours(0,0,0,0);
				const diff = (curr - prev) / (1000 * 60 * 60 * 24);
				if (diff === 1) {
					currentStreak++;
					idx--;
				} else {
					break;
				}
			}
		} else if (diffWithToday === 1) {
			while (idx > 0) {
				const prev = new Date(dates[idx - 1]);
				prev.setHours(0,0,0,0);
				const curr = new Date(dates[idx]);
				curr.setHours(0,0,0,0);
				const diff = (curr - prev) / (1000 * 60 * 60 * 24);
				if (diff === 1) {
					currentStreak++;
					idx--;
				} else {
					break;
				}
			}
		} else {
			currentStreak = 0;
		}

		callback(null, {
			currentStreak,
			bestStreak,
			lastParticipationDate: last
		});
	});
};

/**
 * Récupère le top 5 des joueurs avec la meilleure streak historique.
 * Retourne un tableau d'objets : [{login, bestStreak}]
 * @param {function} callback - callback(err, topStreaks)
 */
exports.getTopStreaks = function(callback) {
	const sql = `
		SELECT login, wordle FROM wordle_participations
		ORDER BY login ASC, wordle ASC
	`;
	db.all(sql, [], (err, rows) => {
		if (err) return callback(err);

		const streaks = {};
		for (const row of rows) {
			const login = row.login;
			const [dd, mm, yyyy] = row.wordle.split('-');
			const date = new Date(`${yyyy}-${mm}-${dd}`);

			if (!streaks[login]) {
				streaks[login] = {
					dates: [],
					bestStreak: 1
				};
			}
			streaks[login].dates.push(date);
		}

		const results = [];
		for (const login in streaks) {
			const dates = streaks[login].dates.sort((a, b) => a - b);
			let bestStreak = 1;
			let streak = 1;
			for (let i = 1; i < dates.length; i++) {
				const prev = dates[i - 1];
				const curr = dates[i];
				const diff = (curr - prev) / (1000 * 60 * 60 * 24);
				if (diff === 1) {
					streak++;
				} else if (diff > 1) {
					streak = 1;
				}
				if (streak > bestStreak) bestStreak = streak;
			}
			results.push({ login, bestStreak });
		}

		results.sort((a, b) => b.bestStreak - a.bestStreak || a.login.localeCompare(b.login));
		callback(null, results.slice(0, 5));
	});
};
