const express = require('express');
const wordleController = require('../controllers/wordle');

const router = express.Router();

router.post('/validateword', wordleController.validateWord );
router.post('/starttyping', wordleController.startTyping );

module.exports = router;