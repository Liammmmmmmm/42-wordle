const axios = require('axios');

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

		const { access_token, refresh_token, expires_in } = tokenResponse.data;

		res.cookie('access_token', access_token, {
			httpOnly: true,
			maxAge: expires_in * 1000,
			sameSite: 'lax',
			secure: false
		});
		res.cookie('refresh_token', refresh_token, {
			httpOnly: true,
			sameSite: 'lax',
			secure: false
		});

		const userResponse = await axios.get('https://api.intra.42.fr/v2/me', {
			headers: {
				Authorization: 'Bearer ' + access_token
			}
		});

		res.cookie('data', { name: userResponse.data.first_name, img: userResponse.data.image.versions.medium }, {
			sameSite: 'lax',
			secure: false
		});

		return res.redirect('/');
	} catch (error) {
		console.error(error);
		return res.status(500).json({ error: true, message: "Token exchange failed" });
	}
}

/**
 * 
 * @param {*} res 
 * @param {String} refresh_token_og
 * @returns {Boolean} Success
 */
async function refreshToken(res, refresh_token_og)
{
	try {
		const tokenResponse = await axios.post('https://api.intra.42.fr/oauth/token', {
			grant_type: "refresh_token",
			client_id: process.env.CLIENT_ID,
			client_secret: process.env.CLIENT_SECRET,
			refresh_token: refresh_token_og,
			redirect_uri: process.env.APP_URL + "/auth/redirection"
		});

		const { access_token, refresh_token, expires_in } = tokenResponse.data;

		res.cookie('access_token', access_token, {
			httpOnly: true,
			maxAge: expires_in * 1000,
			sameSite: 'lax',
			secure: false
		});
		res.cookie('refresh_token', refresh_token, {
			httpOnly: true,
			sameSite: 'lax',
			secure: false
		});

		return true;
	} catch (error) {
		return false;
	}
}
exports.refreshToken = refreshToken;
