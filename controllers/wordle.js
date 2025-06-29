const fs = require("fs");
const db = require('../db');
const jwt = require('jsonwebtoken');

const words = [];

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

function hashString(str) {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = (hash << 5) - hash + str.charCodeAt(i);
		hash |= 0;
	}
	return Math.abs(hash);
}

function getWordOfTheDay(date = null) {
	const targetDate = date || new Date();
	const yyyy = targetDate.getFullYear();
	const mm = String(targetDate.getMonth() + 1).padStart(2, "0");
	const dd = String(targetDate.getDate()).padStart(2, "0");
	const dateKey = `${yyyy}-${mm}-${dd}`;

	const saltedDate = `_wordle_salt_${dateKey}_random_seed`;
	const index = hashString(saltedDate) % words.length;

	return words[index];
}

function getWordOfTheDaySync() {
	return getWordOfTheDay();
}

exports.validateWord = async (req, res) => {
	const word = req.body?.word?.toLowerCase();

	if (!word) return (res.status(400).json({ error: true, details: "Missing parrameter" }));
	if (!words.includes(word)) return (res.status(404).json({ error: true, details: "Invalid word" }));

	const dayWord = getWordOfTheDaySync();

	const validation = ["absent", "absent", "absent", "absent", "absent"];

	if (process.env.DEBUG === "true") {
		console.log(word, dayWord);
	}

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

	return (res.status(200).json({ error: false, validation: validation }));
}

exports.saveResults = async (req, res) => {
	let time = req.body?.time;
	let attempts = req.body?.attempts;
	const word = req.body?.word?.toLowerCase();

	if (!time || !word || !attempts) return (res.status(400).json({ error: true, details: "Missing parrameter" }));

	if (getWordOfTheDaySync() != word) attempts = 7;

	const token = req.cookies?.jwt;
	let userId;
	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		userId = decoded.id;
	} catch (err) {
		return res.status(401).json({ error: true, details: "Invalid token" });
	}

	if (attempts < 1) attempts = 9999;
	if (time < 0) time = 999999;

	const now = new Date();
	const dd = String(now.getDate()).padStart(2, "0");
	const mm = String(now.getMonth() + 1).padStart(2, "0");
	const yyyy = now.getFullYear();
	const wordle = `${dd}-${mm}-${yyyy}`;

	db.get(`SELECT login FROM users WHERE id = ?`, [userId], function (err, row) {
		if (err || !row) {
			return res.status(500).json({ error: true, details: "User not found" });
		}
		const login = row.login;
		db.get(`SELECT id FROM wordle_participations WHERE login = ? AND wordle = ?`, [login, wordle], function (err, row) {
			if (err) return res.status(500).json({ error: true, details: "DB error" });
			if (row) return res.status(409).json({ error: true, details: "Already participated today" });
			db.run(`INSERT INTO wordle_participations (login, wordle, time, attempts) VALUES (?, ?, ?, ?)`, [login, wordle, time, attempts], function (err) {
				if (err) return res.status(500).json({ error: true, details: "DB error" });
				return res.status(200).json({ error: false });
			});
		});
	});
}

exports.getWordleStats = (callback) => {
	const now = new Date();
	const dd = String(now.getDate()).padStart(2, "0");
	const mm = String(now.getMonth() + 1).padStart(2, "0");
	const yyyy = now.getFullYear();
	const wordle = `${dd}-${mm}-${yyyy}`;

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
		ORDER BY id DESC
		LIMIT 10
	`;

	db.all(fastestSql, [wordle], (err, fastest) => {
		if (err) return callback(err);

		db.all(fewestAttemptsSql, [wordle], (err, fewest_attempts) => {
			if (err) return callback(err);

			db.all(latestSql, [], (err, latest) => {
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
	const now = new Date();
	const dd = String(now.getDate()).padStart(2, "0");
	const mm = String(now.getMonth() + 1).padStart(2, "0");
	const yyyy = now.getFullYear();
	const wordle = `${dd}-${mm}-${yyyy}`;

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
		db.get(
			`SELECT time, attempts FROM wordle_participations WHERE login = ? AND wordle = ?`,
			[login, wordle],
			function (err, stats) {
				if (err) return callback({ error: true, details: "DB error" });
				if (!stats) return callback(null, null);
				return callback(null, stats);
			}
		);
	});
};

// Fonction pour récupérer toutes les dates disponibles
exports.getAvailableDates = (callbackOrReq, res = null) => {
	// Support pour utilisation comme middleware Express ET comme fonction callback
	const callback = res ?
		(err, data) => {
			if (err) return res.status(500).json({ error: true, details: err.message });
			res.status(200).json({ error: false, dates: data });
		} :
		callbackOrReq;

	const distinctDaysSql = `
		SELECT DISTINCT wordle FROM wordle_participations 
		ORDER BY wordle DESC
	`;

	db.all(distinctDaysSql, [], (err, days) => {
		if (err) return callback(err);

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

exports.getArchiveByDate = (dateStringOrReq, callbackOrRes = null, res = null) => {
	let dateString, callback;

	if (typeof dateStringOrReq === 'string') {
		dateString = dateStringOrReq;
		callback = callbackOrRes;
	} else {
		// Utilisation comme middleware Express -> j'ai aucune foutues idee de ce que c'est
		const req = dateStringOrReq;
		dateString = req.params.date;
		callback = (err, data) => {
			if (err) return callbackOrRes.status(500).json({ error: true, details: err.message });
			if (!data) return callbackOrRes.status(404).json({ error: true, details: "Archive not found" });
			callbackOrRes.status(200).json({ error: false, archive: data });
		};
	}

	if (!dateString) {
		return callback(new Error("Date is required"));
	}

	const [dd, mm, yyyy] = dateString.split('-');
	const date = new Date(yyyy, mm - 1, dd);
	const wordOfTheDay = getWordOfTheDay(date);

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
	const allPlayersSql = `
		SELECT login, time, attempts FROM wordle_participations
		WHERE wordle = ?
		ORDER BY time ASC
	`;

	db.all(fastestSql, [dateString], (err, fastest) => {
		if (err) return callback(err);

		db.all(fewestAttemptsSql, [dateString], (err, fewest_attempts) => {
			if (err) return callback(err);

			db.all(allPlayersSql, [dateString], (err, allPlayers) => {
				if (err) return callback(err);
				
				const archive = {
					date: dateString,
					formattedDate: `${dd}/${mm}/${yyyy}`,
					displayDate: `${dd} ${getMonthName(parseInt(mm))} ${yyyy}`,
					wordOfTheDay: wordOfTheDay.toUpperCase(),
					stats: {
						fastest,
						fewest_attempts,
						allPlayers
					},
					totalPlayers: allPlayers.length
				};

				callback(null, archive);
			});
		});
	});
};

function getMonthName(monthNum) {
	const months = [
		'', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
		'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
	];
	return months[monthNum];
}
