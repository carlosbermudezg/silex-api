const express = require('express');
const router = express.Router();
const { login, loginmobile } = require('../controllers/auth.controller'); // Importa el controlador de login

// Endpoint de login
router.post('/web', login);
router.post('/mobile', loginmobile);

module.exports = router;