// models/Message.js - Private Message Model
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    messageId: {
        type: String,
        required: true,
        unique: true,
        match: [/^MSG\d{3,}$/, 'Invalid message ID format']
    },
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true,
        maxlength: 5000
    },
    isRead: {
        type: Boolean,
        default: false
    },
    attachments: [{
        filename: String,
        originalName: String,
        mimetype: String,
        size: Number,
        url: String
    }],
    messageType: {
        type: String,
        enum: ['text', 'file', 'system'],
        default: 'text'
    }
}, {
    timestamps: true
});

// Indexes
MessageSchema.index({ conversationId: 1, createdAt: 1 });
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ receiverId: 1 });
MessageSchema.index({ isRead: 1 });

module.exports = mongoose.model('Message', MessageSchema);