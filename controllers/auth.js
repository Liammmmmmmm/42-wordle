const axios = require('axios');
const db = require('../db');
const jwt = require('jsonwebtoken');
const log = require('../log');

exports.redirection = async (req, res) => {
	const code = req.query?.code;

	try {
		const tokenResponse = await axios.post('https://api.intra.42.fr/oauth/token', {
			grant_type: "authorization_code",
			client_id: process.env.CLIENT_ID,
			client_secret: process.env.CLIENT_SECRET,
			code: code,
			state: process.env.FTAPI_STATE,
			redirect_uri: process.env.APP_URL + "/auth/redirection"
		});

		const { access_token } = tokenResponse.data;

		const userResponse = await axios.get('https://api.intra.42.fr/v2/me', {
			headers: {
				Authorization: 'Bearer ' + access_token
			}
		});

		const login = userResponse.data.login;
        const name = userResponse.data.first_name;
        const image = userResponse.data.image.versions.medium;

		db.get('SELECT id FROM users WHERE login = ?', [login], (err, row) => {
			if (err) {
				console.error(err);
				return res.status(401).redirect("/");
			}
			let userId = null;
			if (row) {
				userId = row.id;
				log(`AUTH: ${userId} (${login}, ${name}) logged in`);
				createAndSendJWT(userId, res);
			} else {
				db.run('INSERT INTO users (login, name, image) VALUES (?, ?, ?)', [login, name, image], function(err) {
					if (err) {
						console.error(err);
						return res.status(401).redirect("/");
					}
					userId = this.lastID;
					log(`AUTH: ${userId} (${login}, ${name}) registered`);
					createAndSendJWT(userId, res);
				});
			}
		});
	} catch (error) {
		console.error(error);
		return res.status(401).redirect("/");
	}
}

function createAndSendJWT(userId, res) {
	const token = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '2w' });
	res.cookie('jwt', token, {
		httpOnly: true,
		sameSite: 'lax',
		secure: false
	});
	return res.redirect('/');
}
