const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
    res.render('home', {
        user_data: {img:"https://cdn.intra.42.fr/users/74ef23fe564650b1deb13554ddfddae3/medium_lilefebv.JPG", name: "NOM"},
        login_url: `https://api.intra.42.fr/oauth/authorize/falseurl`
    });
});

router.get('/wordle', (req, res) => {
	res.render('wordle', {
		leaderboard: {} // For the future
	});
});


module.exports = router;
