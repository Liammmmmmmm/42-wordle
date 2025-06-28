const express = require('express');
const wordleController = require('../controllers/wordle');

const router = express.Router();

router.post('/validateword', wordleController.validateWord );

module.exports = router;