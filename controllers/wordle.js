const fs = require("fs");
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const { refreshToken } = require('./auth');

const db = new sqlite3.Database('./dev.db', (err) => {
	if (err) {
		console.error(err.message);
	} else {
		console.log('Connected to the SQLite database.');
	}
});

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

function getWordOfTheDaySync() {
	const now = new Date();
	const yyyy = now.getFullYear();
	const mm = String(now.getMonth() + 1).padStart(2, "0");
	const dd = String(now.getDate()).padStart(2, "0");
	const dateKey = `${yyyy}-${mm}-${dd}`;

	const saltedDate = `wordle_salt_${dateKey}_random_seed`;
	const index = hashString(saltedDate) % words.length;

	return words[index];
}

exports.validateWord = async (req, res) => {
	const word = req.body?.word?.toLowerCase();

	if (!word) return (res.status(400).json({ error: true, details: "Missing parrameter" }));
	if (!words.includes(word)) return (res.status(404).json({ error: true, details: "Invalid word" }));

	const dayWord = getWordOfTheDaySync();

	const validation = ["absent", "absent", "absent", "absent", "absent"];

	console.log(word, dayWord);
	for (let i = 0; i < 5; i++) {
		if (word[i] == dayWord[i]) validation[i] = "correct";
		else if (dayWord.includes(word[i])) validation[i] = "present";
	}

	return (res.status(200).json({ error: false, validation: validation }));
}



exports.saveResults = async (req, res) => {
	const time = req.body?.time;
	const attempts = req.body?.attempts;
	const word = req.body?.word?.toLowerCase();

	if (!time || !word || !attempts) return (res.status(400).json({ error: true, details: "Missing parrameter" }));
	if (getWordOfTheDaySync() != word) return (res.status(400).json({ error: true, details: "Invalid word" }));

	let access_token = req.cookies?.access_token;
	const refresh_token = req.cookies?.refresh_token;
	if (!refresh_token) return res.status(401).json({ error: true, details: "User not logged in" });
	if (!access_token)
	{
		access_token = await refreshToken(res, refresh_token);
		if (!access_token) return res.status(401).json({ error: true, details: "Invalid refresh token" });
	}

	let login;
	try {
		const userResponse = await axios.get('https://api.intra.42.fr/v2/me', {
			headers: {
				Authorization: 'Bearer ' + access_token
			}
		});
		login = userResponse.data.login;
	} catch (err) {

		access_token = await refreshToken(res, refresh_token);
		if (!access_token) return res.status(401).json({ error: true, details: "Invalid refresh token" });

		try {
			const userResponse = await axios.get('https://api.intra.42.fr/v2/me', {
				headers: {
					Authorization: 'Bearer ' + access_token
				}
			});
			login = userResponse.data.login;
		} catch (error) {
			return res.status(401).json({ error: true, details: "Invalid refresh token" });
		}
	}

	if (attempts < 1) attempts = 9999;
	if (time < 0) time = 999999;

	const now = new Date();
	const dd = String(now.getDate()).padStart(2, "0");
	const mm = String(now.getMonth() + 1).padStart(2, "0");
	const yyyy = now.getFullYear();
	const wordle = `${dd}-${mm}-${yyyy}`;

	const checkSql = `SELECT id FROM wordle_participations WHERE login = ? AND wordle = ?`;
	db.get(checkSql, [login, wordle], function (err, row) {
		if (err) {
			return res.status(500).json({ error: true, details: "DB error" });
		}
		if (row) {
			return res.status(409).json({ error: true, details: "Already participated today" });
		}
		const insertSql = `INSERT INTO wordle_participations (login, wordle, time, attempts) VALUES (?, ?, ?, ?)`;
		db.run(insertSql, [login, wordle, time, attempts], function (err) {
			if (err) {
				return res.status(500).json({ error: true, details: "DB error" });
			}
			return res.status(200).json({ error: false });
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
		LIMIT 5
	`;
	const fewestAttemptsSql = `
		SELECT login, time, attempts FROM wordle_participations
		WHERE wordle = ?
		ORDER BY attempts ASC, time ASC
		LIMIT 5
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
