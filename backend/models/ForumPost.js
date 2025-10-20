// models/ForumPost.js - Forum Post Model
const mongoose = require('mongoose');

const ForumPostSchema = new mongoose.Schema({
    postId: {
        type: String,
        required: true,
        unique: true,
        match: [/^POST\d{3,}$/, 'Invalid post ID format']
    },
    authorId: {
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
    isAnonymous: {
        type: Boolean,
        default: false
    },
    likes: {
        type: Number,
        default: 0
    },
    dislikes: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isReported: {
        type: Boolean,
        default: false
    },
    reportReason: {
        type: String,
        maxlength: 500
    },
    tags: [String]
}, {
    timestamps: true
});

// Indexes
ForumPostSchema.index({ topicId: 1, createdAt: -1 });
ForumPostSchema.index({ authorId: 1 });
ForumPostSchema.index({ isActive: 1, createdAt: -1 });

// Virtual for comment count
ForumPostSchema.virtual('commentCount', {
    ref: 'ForumComment',
    localField: '_id',
    foreignField: 'postId',
    count: true
});

// Ensure virtual fields are serialized
ForumPostSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('ForumPost', ForumPostSchema);