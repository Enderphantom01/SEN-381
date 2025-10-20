// models/Conversation.js - Conversation Model for Private Messages
const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
    conversationId: {
        type: String,
        required: true,
        unique: true,
        match: [/^CONV\d{3,}$/, 'Invalid conversation ID format']
    },
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    lastMessage: {
        type: String,
        maxlength: 500
    },
    lastMessageTime: {
        type: Date,
        default: Date.now
    },
    unreadCount: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Indexes
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ lastMessageTime: -1 });
ConversationSchema.index({ isActive: 1 });

module.exports = mongoose.model('Conversation', ConversationSchema);