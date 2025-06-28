const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
	res.render('home');
});

router.get('/wordle', (req, res) => {
	res.render('wordle', {
		leaderboard: {} // For the future
	});
});


module.exports = router;