// routes/auth.js - Authentication Routes
const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { createSession, destroySession, authenticate } = require('../middleware/auth');

const router = express.Router();



module.exports = router;