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

// Indexes - removed messageId index
MessageSchema.index({ conversationId: 1, createdAt: 1 });
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ receiverId: 1 });
MessageSchema.index({ status: 1 });

// Remove the old messageId index when the model is initialized
MessageSchema.on('index', function(error) {
    if (error) {
        console.log('Message index error:', error);
    } else {
        console.log('Message indexes created successfully');
    }
});

module.exports = mongoose.model('Message', MessageSchema);