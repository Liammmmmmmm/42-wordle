const express = require('express');
const authController = require('../controllers/auth');

const router = express.Router();

router.get('/redirection', authController.redirection );

module.exports = router;