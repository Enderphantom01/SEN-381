// models/Notification.js - Notification Model
const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    notificationId: {
        type: String,
        required: true,
        unique: true,
        match: [/^NOT\d{3,}$/, 'Invalid notification ID format']
    },
    recipientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: [
            'new_message',
            'help_request_assigned',
            'forum_reply',
            'topic_update',
            'system_announcement',
            'tutor_approved',
            'admin_alert'
        ],
        required: true
    },
    title: {
        type: String,
        required: true,
        maxlength: 200
    },
    content: {
        type: String,
        required: true,
        maxlength: 1000
    },
    status: {
        type: String,
        enum: ['pending', 'sent', 'delivered', 'read'],
        default: 'pending'
    },
    isRead: {
        type: Boolean,
        default: false
    },
    relatedEntity: {
        entityType: {
            type: String,
            enum: ['conversation', 'help_request', 'forum_post', 'topic', 'user']
        },
        entityId: mongoose.Schema.Types.ObjectId
    },
    emailSent: {
        type: Boolean,
        default: false
    },
    smsSent: {
        type: Boolean,
        default: false
    },
    pushSent: {
        type: Boolean,
        default: false
    },
    metadata: mongoose.Schema.Types.Mixed
}, {
    timestamps: true
});

// Indexes
NotificationSchema.index({ recipientId: 1, createdAt: -1 });
NotificationSchema.index({ type: 1 });
NotificationSchema.index({ isRead: 1 });
NotificationSchema.index({ status: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);