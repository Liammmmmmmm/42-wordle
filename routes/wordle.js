const express = require('express');
const wordleController = require('../controllers/wordle');

const router = express.Router();

// Suppression de la dépendance à players_data car maintenant géré en DB
router.post('/validateword', wordleController.validateWord);
router.post('/starttyping', wordleController.startTyping);
router.get('/dates', wordleController.getAvailableDates);
router.get('/archive/:date', wordleController.getArchiveByDate);

module.exports = router;
