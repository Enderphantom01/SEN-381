// routes/notifications.js - Notification System with Email Integration
const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const router = express.Router();



module.exports = {
    router
    // export notifications to the router
};