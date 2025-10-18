// models/Profile.js - Profile Model
const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    bio: {
        type: String,
        maxlength: 500
    },
    academicBackground: {
        qualifications: [{
            institution: String,
            qualification: String,
            year: Number
        }],
        areasOfExpertise: [String]
    },
    activityLog: [{
        action: String,
        timestamp: {
            type: Date,
            default: Date.now
        },
        details: mongoose.Schema.Types.Mixed
    }],
    subscribedTopics: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Topic'
    }]
}, {
    timestamps: true
});

// Ensure one profile per user
ProfileSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model('Profile', ProfileSchema);