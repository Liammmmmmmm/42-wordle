const express = require('express');
const wordleController = require('../controllers/wordle');


module.exports = (players_data) => {
	const router = express.Router();
	
	router.post('/validateword', (req, res, next) => {
		req.players = players_data;
		next();
	},
	wordleController.validateWord );

	router.post('/starttyping', (req, res, next) => {
		req.players = players_data;
		next();
	},
	wordleController.startTyping );
	
	router.get('/dates', wordleController.getAvailableDates );
	router.get('/archive/:date', wordleController.getArchiveByDate );
	return router
};
