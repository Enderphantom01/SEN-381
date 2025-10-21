// models/Message.js - Updated Private Message Model
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    conversationId: {
        type: String,
        required: true
    },
    senderId: {
        type: String,
        required: true
    },
    receiverId: {
        type: String,
        required: true
    },
    text: {
        type: String,
        required: true,
        maxlength: 5000
    },
    status: {
        type: String,
        enum: ['sent', 'received', 'read'],
        default: 'sent'
    },
    messageType: {
        type: String,
        enum: ['text', 'file', 'system'],
        default: 'text'
    },
    file: {
        name: String,
        type: String,
        url: String,
        size: Number
    }
}, {
    timestamps: true
});

// Indexes
MessageSchema.index({ conversationId: 1, createdAt: 1 });
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ receiverId: 1 });
MessageSchema.index({ status: 1 });

// Auto-generate messageId before saving
MessageSchema.pre('save', function(next) {
    if (!this.messageId) {
        this.messageId = `MSG${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
    }
    next();
});

module.exports = mongoose.model('Message', MessageSchema);