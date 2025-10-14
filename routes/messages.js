// routes/messages.js - Private Messaging System
const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { sendNotification } = require('./notifications'); // We'll create this next
const router = express.Router();



module.exports = router;