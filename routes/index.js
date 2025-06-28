const express = require('express');
const { getWordleStats } = require('../controllers/wordle');

const router = express.Router();

router.get('/', (req, res) => {
	console.log(req.cookies)
	const data = req.cookies.data;
	res.render('home', {
		user_data: data,
		login_url: `https://api.intra.42.fr/oauth/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${process.env.APP_URL}/auth/redirection&response_type=code&scope=public&state=${process.env.FTAPI_STATE}`
	});
});

router.get('/wordle', (req, res) => {
	getWordleStats((err, stats) => {
		if (err) {
			res.render('wordle', {
				leaderboards: null
			});
		} else {
			res.render('wordle', {
				leaderboards: stats
			});
		}
	});
});


module.exports = router;