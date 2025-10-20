// routes/forum.js - Complete Forum Routes with Database
const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate, optionalAuth } = require('../middleware/auth');
const ForumPost = require('../models/ForumPost');
const ForumComment = require('../models/ForumComment.js');
const User = require('../models/user');
const Topic = require('../models/topic');
const { sendNotification } = require('./notifications.js');

const router = express.Router();

/**
 * GET /api/forum/posts
 * Get all forum posts with optional filtering
 */
router.get('/posts', optionalAuth, async (req, res) => {
    try {
        const { topic, search, author, sortBy = 'date', sortOrder = 'desc', page = 1, limit = 20 } = req.query;
        
        let query = { isActive: true };
        let sort = {};

        // Filter by topic
        if (topic) {
            const topicDoc = await Topic.findOne({ topicId: topic });
            if (topicDoc) {
                query.topicId = topicDoc._id;
            }
        }

        // Filter by search term
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } },
                { tags: { $in: [new RegExp(search, 'i')] } }
            ];
        }

        // Filter by author
        if (author) {
            const authorDoc = await User.findOne({ userId: author });
            if (authorDoc) {
                query.authorId = authorDoc._id;
            }
        }

        // Sort configuration
        switch (sortBy) {
            case 'likes':
                sort = { likes: sortOrder === 'asc' ? 1 : -1 };
                break;
            case 'comments':
                // This would require aggregation for comment count
                sort = { createdAt: -1 }; // Default for now
                break;
            case 'date':
            default:
                sort = { createdAt: sortOrder === 'asc' ? 1 : -1 };
        }

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const posts = await ForumPost.find(query)
            .populate('authorId', 'userId name email role')
            .populate('topicId', 'topicId title')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        // Get total count for pagination
        const totalPosts = await ForumPost.countDocuments(query);

        // Get comment counts and user interaction status
        const postsWithDetails = await Promise.all(
            posts.map(async (post) => {
                const commentCount = await ForumComment.countDocuments({ 
                    postId: post._id, 
                    isActive: true 
                });

                return {
                    postId: post.postId,
                    title: post.title,
                    content: post.content.substring(0, 200) + (post.content.length > 200 ? '...' : ''),
                    authorName: post.isAnonymous ? 'Anonymous' : post.authorId.name,
                    authorRole: post.isAnonymous ? null : post.authorId.role,
                    topicId: post.topicId.topicId,
                    topicTitle: post.topicId.title,
                    isAnonymous: post.isAnonymous,
                    likes: post.likes,
                    dislikes: post.dislikes,
                    commentCount: commentCount,
                    createdAt: post.createdAt,
                    userLiked: false, // Would be determined by user's interaction
                    userDisliked: false // Would be determined by user's interaction
                };
            })
        );

        res.status(200).json({
            posts: postsWithDetails,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalPosts / limit),
                totalPosts: totalPosts,
                hasNext: (skip + posts.length) < totalPosts,
                hasPrev: parseInt(page) > 1
            }
        });

    } catch (error) {
        console.error('Get forum posts error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to fetch forum posts'
        });
    }
});

/**
 * GET /api/forum/posts/:postId
 * Get specific forum post with comments
 */
router.get('/posts/:postId', optionalAuth, async (req, res) => {
    try {
        const { postId } = req.params;

        const post = await ForumPost.findOne({ postId })
            .populate('authorId', 'userId name email role')
            .populate('topicId', 'topicId title subjectId');

        if (!post) {
            return res.status(404).json({
                error: 'Post not found',
                message: 'Forum post not found'
            });
        }

        // Get comments with nested replies
        const comments = await ForumComment.find({ 
            postId: post._id, 
            isActive: true,
            parentCommentId: null 
        })
            .populate('authorId', 'userId name email role')
            .sort({ createdAt: 1 });

        // Get replies for each comment
        const commentsWithReplies = await Promise.all(
            comments.map(async (comment) => {
                const replies = await ForumComment.find({
                    postId: post._id,
                    parentCommentId: comment._id,
                    isActive: true
                })
                    .populate('authorId', 'userId name email role')
                    .sort({ createdAt: 1 });

                return {
                    commentId: comment.commentId,
                    content: comment.content,
                    authorName: comment.authorId.name,
                    authorRole: comment.authorId.role,
                    isInstructor: comment.isInstructor,
                    likes: comment.likes,
                    dislikes: comment.dislikes,
                    createdAt: comment.createdAt,
                    replies: replies.map(reply => ({
                        commentId: reply.commentId,
                        content: reply.content,
                        authorName: reply.authorId.name,
                        authorRole: reply.authorId.role,
                        isInstructor: reply.isInstructor,
                        likes: reply.likes,
                        dislikes: reply.dislikes,
                        createdAt: reply.createdAt
                    }))
                };
            })
        );

        const postWithDetails = {
            postId: post.postId,
            title: post.title,
            content: post.content,
            authorName: post.isAnonymous ? 'Anonymous' : post.authorId.name,
            authorRole: post.isAnonymous ? null : post.authorId.role,
            topicId: post.topicId.topicId,
            topicTitle: post.topicId.title,
            isAnonymous: post.isAnonymous,
            likes: post.likes,
            dislikes: post.dislikes,
            createdAt: post.createdAt,
            comments: commentsWithReplies
        };

        res.status(200).json({
            post: postWithDetails
        });

    } catch (error) {
        console.error('Get forum post error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to fetch forum post'
        });
    }
});

/**
 * POST /api/forum/posts
 * Create a new forum post
 */
router.post('/posts', [
    authenticate(),
    body('title')
        .isLength({ min: 5, max: 200 })
        .trim()
        .escape()
        .withMessage('Title must be between 5 and 200 characters'),
    body('content')
        .isLength({ min: 10, max: 5000 })
        .trim()
        .escape()
        .withMessage('Content must be between 10 and 5000 characters'),
    body('topicId')
        .isLength({ min: 1 })
        .withMessage('Topic ID is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { title, content, topicId, isAnonymous = false, tags = [] } = req.body;
        const author = await User.findOne({ userId: req.user.userId });

        // Verify topic exists
        const topic = await Topic.findOne({ topicId });
        if (!topic) {
            return res.status(404).json({
                error: 'Topic not found',
                message: 'Topic not found'
            });
        }

        // Generate post ID
        const postCount = await ForumPost.countDocuments();
        const postId = `POST${String(postCount + 1).padStart(3, '0')}`;

        // Create new forum post
        const newPost = new ForumPost({
            postId,
            authorId: author._id,
            topicId: topic._id,
            title,
            content,
            isAnonymous: Boolean(isAnonymous),
            tags
        });

        await newPost.save();

        // Notify topic subscribers about new post
        const topicSubscribers = await Topic.findById(topic._id).select('subscribers');
        if (topicSubscribers && topicSubscribers.subscribers.length > 0) {
            for (const subscriberId of topicSubscribers.subscribers) {
                if (!subscriberId.equals(author._id)) { // Don't notify the author
                    await sendNotification({
                        recipientId: subscriberId,
                        type: 'forum_reply',
                        title: `New post in ${topic.title}`,
                        content: `New forum post: "${title}"`,
                        relatedEntity: {
                            type: 'forum_post',
                            id: newPost._id
                        }
                    });
                }
            }
        }

        res.status(201).json({
            message: 'Forum post created successfully',
            post: {
                ...newPost.toObject(),
                authorName: isAnonymous ? 'Anonymous' : author.name
            }
        });

    } catch (error) {
        console.error('Create forum post error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to create forum post'
        });
    }
});

/**
 * POST /api/forum/posts/:postId/comments
 * Add comment to a forum post
 */
router.post('/posts/:postId/comments', [
    authenticate(),
    body('content')
        .isLength({ min: 1, max: 1000 })
        .trim()
        .escape()
        .withMessage('Comment must be between 1 and 1000 characters'),
    body('parentCommentId')
        .optional()
        .isMongoId()
        .withMessage('Invalid parent comment ID')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { postId } = req.params;
        const { content, parentCommentId } = req.body;
        const author = await User.findOne({ userId: req.user.userId });

        const post = await ForumPost.findOne({ postId });
        if (!post) {
            return res.status(404).json({
                error: 'Post not found',
                message: 'Forum post not found'
            });
        }

        // Generate comment ID
        const commentCount = await ForumComment.countDocuments();
        const commentId = `CMT${String(commentCount + 1).padStart(3, '0')}`;

        // Create new comment
        const newComment = new ForumComment({
            commentId,
            postId: post._id,
            authorId: author._id,
            content,
            parentCommentId: parentCommentId || null,
            isInstructor: author.role === 'Tutor' || author.role === 'Admin'
        });

        await newComment.save();

        // Notify post author about new comment (if not the author themselves)
        if (!post.authorId.equals(author._id)) {
            await sendNotification({
                recipientId: post.authorId,
                type: 'forum_reply',
                title: `New comment on your post`,
                content: `${author.name} commented on your post: "${content.substring(0, 100)}..."`,
                relatedEntity: {
                    type: 'forum_post',
                    id: post._id
                }
            });
        }

        res.status(201).json({
            message: 'Comment added successfully',
            comment: {
                ...newComment.toObject(),
                authorName: author.name,
                authorRole: author.role
            }
        });

    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to add comment'
        });
    }
});

/**
 * POST /api/forum/posts/:postId/like
 * Like a forum post
 */
router.post('/posts/:postId/like', authenticate(), async (req, res) => {
    try {
        const { postId } = req.params;

        const post = await ForumPost.findOne({ postId });
        if (!post) {
            return res.status(404).json({
                error: 'Post not found',
                message: 'Forum post not found'
            });
        }

        // In a real implementation, you'd track which users have liked/disliked
        // For now, we'll just increment the count
        post.likes += 1;
        await post.save();

        res.status(200).json({
            message: 'Post liked successfully',
            likes: post.likes,
            dislikes: post.dislikes
        });

    } catch (error) {
        console.error('Like post error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to like post'
        });
    }
});

/**
 * POST /api/forum/posts/:postId/dislike
 * Dislike a forum post
 */
router.post('/posts/:postId/dislike', authenticate(), async (req, res) => {
    try {
        const { postId } = req.params;

        const post = await ForumPost.findOne({ postId });
        if (!post) {
            return res.status(404).json({
                error: 'Post not found',
                message: 'Forum post not found'
            });
        }

        post.dislikes += 1;
        await post.save();

        res.status(200).json({
            message: 'Post disliked successfully',
            likes: post.likes,
            dislikes: post.dislikes
        });

    } catch (error) {
        console.error('Dislike post error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to dislike post'
        });
    }
});

/**
 * GET /api/forum/trending
 * Get trending topics and posts
 */
router.get('/trending', optionalAuth, async (req, res) => {
    try {
        // Get most popular posts (by likes and comments)
        const trendingPosts = await ForumPost.find({ isActive: true })
            .populate('authorId', 'userId name email role')
            .populate('topicId', 'topicId title')
            .sort({ likes: -1, createdAt: -1 })
            .limit(5);

        const trendingPostsWithDetails = await Promise.all(
            trendingPosts.map(async (post) => {
                const commentCount = await ForumComment.countDocuments({ 
                    postId: post._id, 
                    isActive: true 
                });

                return {
                    postId: post.postId,
                    title: post.title,
                    authorName: post.isAnonymous ? 'Anonymous' : post.authorId.name,
                    likes: post.likes,
                    commentCount: commentCount,
                    createdAt: post.createdAt,
                    topicTitle: post.topicId.title
                };
            })
        );

        // Get active topics with most posts
        const activeTopics = await Topic.aggregate([
            { $match: { isActive: true } },
            {
                $lookup: {
                    from: 'forumposts',
                    localField: '_id',
                    foreignField: 'topicId',
                    as: 'posts'
                }
            },
            {
                $project: {
                    topicId: 1,
                    title: 1,
                    postCount: { $size: '$posts' },
                    subscriberCount: { $size: '$subscribers' }
                }
            },
            { $sort: { postCount: -1, subscriberCount: -1 } },
            { $limit: 5 }
        ]);

        res.status(200).json({
            trendingPosts: trendingPostsWithDetails,
            activeTopics: activeTopics,
            updatedAt: new Date()
        });

    } catch (error) {
        console.error('Get trending error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to fetch trending content'
        });
    }
});

/**
 * PUT /api/forum/posts/:postId/report
 * Report a forum post for moderation
 */
router.put('/posts/:postId/report', [
    authenticate(),
    body('reason')
        .isLength({ min: 10, max: 500 })
        .trim()
        .escape()
        .withMessage('Reason must be between 10 and 500 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { postId } = req.params;
        const { reason } = req.body;

        const post = await ForumPost.findOne({ postId });
        if (!post) {
            return res.status(404).json({
                error: 'Post not found',
                message: 'Forum post not found'
            });
        }

        post.isReported = true;
        post.reportReason = reason;
        await post.save();

        // Notify admins about reported post
        const admins = await User.find({ role: 'Admin' });
        for (const admin of admins) {
            await sendNotification({
                recipientId: admin._id,
                type: 'admin_alert',
                title: 'Post Reported for Moderation',
                content: `Post "${post.title}" has been reported. Reason: ${reason}`,
                relatedEntity: {
                    type: 'forum_post',
                    id: post._id
                }
            });
        }

        res.status(200).json({
            message: 'Post reported successfully. Moderators will review it.'
        });

    } catch (error) {
        console.error('Report post error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to report post'
        });
    }
});

module.exports = router;