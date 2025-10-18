// models/HelpRequest.js - Help Request Model
const mongoose = require('mongoose');

const HelpRequestSchema = new mongoose.Schema({
    requestId: {
        type: String,
        required: true,
        unique: true,
        match: [/^REQ\d{3,}$/, 'Invalid request ID format']
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    topicId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Topic',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    content: {
        type: String,
        required: true,
        maxlength: 5000
    },
    status: {
        type: String,
        enum: ['open', 'assigned', 'in-progress', 'resolved', 'closed'],
        default: 'open'
    },
    assignedTutorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    resolution: {
        answer: String,
        resolvedAt: Date,
        resolvedById: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }
}, {
    timestamps: true
});

// Indexes
HelpRequestSchema.index({ studentId: 1, status: 1 });
HelpRequestSchema.index({ topicId: 1, status: 1 });
HelpRequestSchema.index({ assignedTutorId: 1, status: 1 });

module.exports = mongoose.model('HelpRequest', HelpRequestSchema);