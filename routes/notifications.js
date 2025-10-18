// routes/notifications.js - Complete Notification System with Database
const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const Notification = require('../models/Notification');
const User = require('../models/user');
const Profile = require('../models/Profile');

const router = express.Router();

// Mock email service (in production, use nodemailer, SendGrid, etc.)
const sendEmail = async (to, subject, htmlBody) => {
    try {
        console.log(`[EMAIL] Sending to: ${to}`);
        console.log(`[EMAIL] Subject: ${subject}`);
        console.log(`[EMAIL] Body: ${htmlBody.substring(0, 100)}...`);
        
        // Simulate email sending delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log(`[EMAIL] Successfully sent to: ${to}`);
        return true;
    } catch (error) {
        console.error('[EMAIL] Failed to send:', error);
        return false;
    }
};

// Mock SMS service
const sendSMS = async (to, message) => {
    try {
        console.log(`[SMS] Sending to: ${to}`);
        console.log(`[SMS] Message: ${message}`);
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        console.log(`[SMS] Successfully sent to: ${to}`);
        return true;
    } catch (error) {
        console.error('[SMS] Failed to send:', error);
        return false;
    }
};

/**
 * Send notification to user (in-app, email, SMS based on preferences)
 */
const sendNotification = async (notificationData) => {
    try {
        const {
            recipientId,
            type,
            title,
            content,
            relatedEntity,
            emailSubject,
            emailBody
        } = notificationData;

        // Get recipient details
        const recipient = await User.findById(recipientId);
        if (!recipient) {
            console.error('Recipient not found:', recipientId);
            return false;
        }

        // Get recipient's notification preferences from profile
        const profile = await Profile.findOne({ userId: recipientId });
        const preferences = profile?.notificationPreferences || {
            email: true,
            push: true,
            sms: false
        };

        // Generate notification ID
        const notificationCount = await Notification.countDocuments();
        const notificationId = `NOT${String(notificationCount + 1).padStart(3, '0')}`;

        // Create in-app notification
        const newNotification = new Notification({
            notificationId,
            recipientId,
            type,
            title,
            content,
            relatedEntity,
            metadata: {
                emailSubject,
                emailBody
            }
        });

        await newNotification.save();

        let emailSent = false;
        let smsSent = false;

        // Send email notification if enabled
        if (preferences.email && emailSubject && emailBody) {
            emailSent = await sendEmail(recipient.email, emailSubject, emailBody);
            if (emailSent) {
                newNotification.emailSent = true;
                console.log(`Email notification sent to ${recipient.email}`);
            }
        }

        // Send SMS notification if enabled and phone number exists
        if (preferences.sms && recipient.phoneNumber) {
            const smsMessage = `${title}: ${content}`;
            smsSent = await sendSMS(recipient.phoneNumber, smsMessage);
            if (smsSent) {
                newNotification.smsSent = true;
                console.log(`SMS notification sent to ${recipient.phoneNumber}`);
            }
        }

        // Update notification status
        newNotification.status = 'delivered';
        await newNotification.save();

        // In production, you would also send push notifications here

        return true;
    } catch (error) {
        console.error('Send notification error:', error);
        return false;
    }
};

/**
 * GET /api/notifications
 * Get notifications for current user
 */
router.get('/', authenticate(), async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.user.userId });
        const { unreadOnly = 'false', limit = 20, page = 1 } = req.query;

        let query = { recipientId: user._id };

        if (unreadOnly === 'true') {
            query.isRead = false;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const totalNotifications = await Notification.countDocuments(query);
        const unreadCount = await Notification.countDocuments({
            recipientId: user._id,
            isRead: false
        });

        res.status(200).json({
            notifications: notifications,
            unreadCount: unreadCount,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalNotifications / limit),
                totalNotifications: totalNotifications,
                hasNext: (skip + notifications.length) < totalNotifications,
                hasPrev: parseInt(page) > 1
            }
        });

    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to fetch notifications'
        });
    }
});

/**
 * PUT /api/notifications/:notificationId/read
 * Mark notification as read
 */
router.put('/:notificationId/read', authenticate(), async (req, res) => {
    try {
        const { notificationId } = req.params;
        const user = await User.findOne({ userId: req.user.userId });

        const notification = await Notification.findOne({
            notificationId,
            recipientId: user._id
        });

        if (!notification) {
            return res.status(404).json({
                error: 'Notification not found',
                message: 'Notification not found'
            });
        }

        notification.isRead = true;
        await notification.save();

        res.status(200).json({
            message: 'Notification marked as read'
        });

    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to mark notification as read'
        });
    }
});

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
router.put('/read-all', authenticate(), async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.user.userId });

        await Notification.updateMany(
            { 
                recipientId: user._id,
                isRead: false 
            },
            { 
                $set: { isRead: true } 
            }
        );

        res.status(200).json({
            message: 'All notifications marked as read'
        });

    } catch (error) {
        console.error('Mark all notifications read error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to mark notifications as read'
        });
    }
});

/**
 * GET /api/notifications/preferences
 * Get user's notification preferences
 */
router.get('/preferences', authenticate(), async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.user.userId });
        const profile = await Profile.findOne({ userId: user._id });

        const preferences = profile?.notificationPreferences || {
            email: true,
            push: true,
            sms: false
        };

        res.status(200).json({
            preferences: preferences
        });

    } catch (error) {
        console.error('Get notification preferences error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to fetch notification preferences'
        });
    }
});

/**
 * PUT /api/notifications/preferences
 * Update user's notification preferences
 */
router.put('/preferences', [
    authenticate(),
    body('email')
        .optional()
        .isBoolean()
        .withMessage('Email preference must be a boolean'),
    body('push')
        .optional()
        .isBoolean()
        .withMessage('Push preference must be a boolean'),
    body('sms')
        .optional()
        .isBoolean()
        .withMessage('SMS preference must be a boolean')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { email, push, sms } = req.body;
        const user = await User.findOne({ userId: req.user.userId });

        // Update or create profile with notification preferences
        const updatedProfile = await Profile.findOneAndUpdate(
            { userId: user._id },
            { 
                $set: { 
                    notificationPreferences: {
                        email: email !== undefined ? email : true,
                        push: push !== undefined ? push : true,
                        sms: sms !== undefined ? sms : false
                    }
                } 
            },
            { 
                upsert: true, 
                new: true 
            }
        );

        res.status(200).json({
            message: 'Notification preferences updated successfully',
            preferences: updatedProfile.notificationPreferences
        });

    } catch (error) {
        console.error('Update notification preferences error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to update notification preferences'
        });
    }
});

/**
 * DELETE /api/notifications/:notificationId
 * Delete a notification
 */
router.delete('/:notificationId', authenticate(), async (req, res) => {
    try {
        const { notificationId } = req.params;
        const user = await User.findOne({ userId: req.user.userId });

        const notification = await Notification.findOne({
            notificationId,
            recipientId: user._id
        });

        if (!notification) {
            return res.status(404).json({
                error: 'Notification not found',
                message: 'Notification not found'
            });
        }

        await Notification.deleteOne({ _id: notification._id });

        res.status(200).json({
            message: 'Notification deleted successfully'
        });

    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to delete notification'
        });
    }
});

/**
 * POST /api/notifications/test
 * Send a test notification (for development)
 */
router.post('/test', authenticate(), async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.user.userId });

        const testNotification = await sendNotification({
            recipientId: user._id,
            type: 'system_announcement',
            title: 'Test Notification',
            content: 'This is a test notification to verify your notification settings are working correctly.',
            emailSubject: 'Test Notification - CampusLearn',
            emailBody: `
                <h2>Test Notification</h2>
                <p>This is a test email to verify your notification settings are working correctly.</p>
                <p>If you received this email, your email notifications are properly configured.</p>
                <hr>
                <p><small>This is a test notification from CampusLearn.</small></p>
            `
        });

        if (testNotification) {
            res.status(200).json({
                message: 'Test notification sent successfully'
            });
        } else {
            res.status(500).json({
                error: 'Failed to send test notification'
            });
        }

    } catch (error) {
        console.error('Test notification error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to send test notification'
        });
    }
});

module.exports = {
    router,
    sendNotification
};