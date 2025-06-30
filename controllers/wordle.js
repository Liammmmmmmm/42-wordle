const fs = require("fs");
const db = require('../db');
const jwt = require('jsonwebtoken');

const words = [];

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

function hashString(str) {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = (hash << 5) - hash + str.charCodeAt(i);
		hash |= 0;
	}
	return Math.abs(hash);
}

function getFormatedDate() {
	const now = new Date();
	const yyyy = now.getFullYear();
	const mm = String(now.getMonth() + 1).padStart(2, "0");
	const dd = String(now.getDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
}

function getWordOfTheDaySync() {
	const dateKey = getFormatedDate();

	const saltedDate = `_wordle_salt_${dateKey}_random_seed`;
	const index = hashString(saltedDate) % words.length;

	return words[index];
}

exports.validateWord = async (req, res) => {
	const word = req.body?.word?.toLowerCase();

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
	if (players_data.id) if (players_data.id.date != getFormatedDate()) players_data.id = null;

	if (!players_data.id || players_data.id.attempts === undefined) return res.status(401).json({ error: true, details: "Bro you didn't even started the game" });

	players_data.id.attempts++;

	const dayWord = getWordOfTheDaySync();

	const validation = ["absent", "absent", "absent", "absent", "absent"];

	for (let i = 0; i < 5; i++) {
		if (word[i] == dayWord[i]) validation[i] = "correct";
		else if (dayWord.includes(word[i])) validation[i] = "present";
	}

	if (word == dayWord || players_data.id.attempts >= 6) {
		const saveResultsResponse = await saveResults(userId, (Date.now() - players_data.id.start_time) / 1000, players_data.id.attempts, word);
				
		if (saveResultsResponse.error) {
			return res.status(502).json({ error: true, validation: validation, details: saveResultsResponse.details });
		} else {
			return (res.status(200).json({ error: false, validation: validation }));
		}
	} else {
		return (res.status(200).json({ error: false, validation: validation }));
	}
}

exports.startTyping = async (req, res) => {
	const token = req.cookies?.jwt;
	let userId;

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		userId = decoded.id;
	} catch (err) {
		return res.status(401).json({ error: true, details: "Invalid token" });
	}

	if (players_data.id) if (players_data.id.date != getFormatedDate()) players_data.id = null;

	players_data.id = { start_time: Date.now(), attempts: 0, date: getFormatedDate() };
}

async function saveResults(userId, time, attempts, word) {
	return new Promise((resolve, reject) => {
		if (getWordOfTheDaySync() != word) attempts = 7;

		if (attempts < 1) attempts = 9999;
		if (time < 1) time = 999999; // 800ms d'animations, impossible de deviner en moins de 200ms donc triche

		const wordle = getFormatedDate();

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