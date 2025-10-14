// routes/forum.js - Forum Management Routes
const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate, optionalAuth } = require('../middleware/auth');
const router = express.Router();


module.exports = router;