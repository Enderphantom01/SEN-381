// models/ForumComment.js - Forum Comment Model
const mongoose = require('mongoose');

const ForumCommentSchema = new mongoose.Schema({
    commentId: {
        type: String,
        required: true,
        unique: true,
        match: [/^CMT\d{3,}$/, 'Invalid comment ID format']
    },
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumPost',
        required: true
    },
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true,
        maxlength: 1000
    },
    likes: {
        type: Number,
        default: 0
    },
    dislikes: {
        type: Number,
        default: 0
    },
    isInstructor: {
        type: Boolean,
        default: false
    },
    parentCommentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumComment',
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Indexes
ForumCommentSchema.index({ postId: 1, createdAt: 1 });
ForumCommentSchema.index({ authorId: 1 });
ForumCommentSchema.index({ parentCommentId: 1 });

module.exports = mongoose.model('ForumComment', ForumCommentSchema);