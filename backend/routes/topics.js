// routes/topics.js - Complete Topic Management Routes with Database
const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const Topic = require('../models/topic');
const HelpRequest = require('../models/helprequest');
const User = require('../models/user');
const Profile = require('../models/Profile');

const router = express.Router();

/**
 * GET /api/topics
 * Get all topics with optional filtering
 */
router.get('/', authenticate(), async (req, res) => {
    try {
        const { subject, search, activeOnly = 'true' } = req.query;
        let query = {};

        // Filter by subject
        if (subject) {
            query.subjectId = subject;
        }

        // Filter by active status
        if (activeOnly === 'true') {
            query.isActive = true;
        }

        // Search filter
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const topics = await Topic.find(query)
            .populate('creatorId', 'userId name email role')
            .sort({ createdAt: -1 });

        // Get user's subscribed topics
        const user = await User.findOne({ userId: req.user.userId });
        const userProfile = await Profile.findOne({ userId: user._id });
        const userSubscriptions = userProfile?.subscribedTopics || [];

        // Get help request counts for each topic
        const topicsWithDetails = await Promise.all(
            topics.map(async (topic) => {
                const helpRequestCount = await HelpRequest.countDocuments({ 
                    topicId: topic._id,
                    status: { $in: ['open', 'assigned', 'in-progress'] }
                });

                return {
                    topicId: topic.topicId,
                    title: topic.title,
                    description: topic.description,
                    creatorId: topic.creatorId.userId,
                    creatorName: topic.creatorId.name,
                    subjectId: topic.subjectId,
                    createdAt: topic.createdAt,
                    isActive: topic.isActive,
                    subscriberCount: topic.subscribers.length,
                    isSubscribed: userSubscriptions.includes(topic._id),
                    helpRequestCount: helpRequestCount
                };
            })
        );

        res.status(200).json({
            topics: topicsWithDetails,
            userSubscriptions: userSubscriptions,
            total: topicsWithDetails.length
        });

    } catch (error) {
        console.error('Get topics error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to fetch topics'
        });
    }
});

/**
 * GET /api/topics/:topicId
 * Get specific topic with details
 */
router.get('/:topicId', authenticate(), async (req, res) => {
    try {
        const { topicId } = req.params;

        const topic = await Topic.findOne({ topicId })
            .populate('creatorId', 'userId name email role')
            .populate('subscribers', 'userId name email role');

        if (!topic) {
            return res.status(404).json({
                error: 'Topic not found',
                message: 'Topic not found'
            });
        }

        // Get related help requests
        const topicHelpRequests = await HelpRequest.find({ topicId: topic._id })
            .populate('studentId', 'userId name email')
            .populate('assignedTutorId', 'userId name email')
            .sort({ creationDate: -1 });

        // Check if user is subscribed
        const user = await User.findOne({ userId: req.user.userId });
        const userProfile = await Profile.findOne({ userId: user._id });
        const isSubscribed = userProfile?.subscribedTopics.includes(topic._id) || false;

        const topicDetails = {
            ...topic.toObject(),
            isSubscribed: isSubscribed,
            helpRequests: topicHelpRequests
        };

        res.status(200).json({
            topic: topicDetails
        });

    } catch (error) {
        console.error('Get topic error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to fetch topic'
        });
    }
});

/**
 * POST /api/topics
 * Create a new topic
 */
router.post('/', [
    authenticate(),
    body('title')
        .isLength({ min: 5, max: 200 })
        .trim()
        .escape()
        .withMessage('Title must be between 5 and 200 characters'),
    body('description')
        .isLength({ min: 10, max: 1000 })
        .trim()
        .escape()
        .withMessage('Description must be between 10 and 1000 characters'),
    body('subjectId')
        .isLength({ min: 1 })
        .withMessage('Subject ID is required')
], async (req, res) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { title, description, subjectId } = req.body;
        const creator = await User.findOne({ userId: req.user.userId });

        // Generate topic ID
        const topicCount = await Topic.countDocuments();
        const topicId = `TPC${String(topicCount + 1).padStart(3, '0')}`;

        // Create new topic
        const newTopic = new Topic({
            topicId,
            title,
            description,
            creatorId: creator._id,
            subjectId,
            subscribers: [creator._id] // Creator auto-subscribes
        });

        await newTopic.save();

        // Add to user's profile activity
        await Profile.findOneAndUpdate(
            { userId: creator._id },
            { 
                $push: { 
                    activityLog: {
                        action: 'topic_created',
                        timestamp: new Date(),
                        details: { topicId: newTopic.topicId, title: newTopic.title }
                    }
                } 
            }
        );

        res.status(201).json({
            message: 'Topic created successfully',
            topic: {
                topicId: newTopic.topicId,
                title: newTopic.title,
                description: newTopic.description,
                creatorId: creator.userId,
                subjectId: newTopic.subjectId,
                createdAt: newTopic.createdAt,
                isSubscribed: true
            }
        });

    } catch (error) {
        console.error('Create topic error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to create topic'
        });
    }
});

/**
 * PUT /api/topics/:topicId
 * Update a topic (creator or admin only)
 */
router.put('/:topicId', [
    authenticate(),
    body('title')
        .optional()
        .isLength({ min: 5, max: 200 })
        .trim()
        .escape()
        .withMessage('Title must be between 5 and 200 characters'),
    body('description')
        .optional()
        .isLength({ min: 10, max: 1000 })
        .trim()
        .escape()
        .withMessage('Description must be between 10 and 1000 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { topicId } = req.params;
        const { title, description } = req.body;
        const user = await User.findOne({ userId: req.user.userId });

        const topic = await Topic.findOne({ topicId });
        if (!topic) {
            return res.status(404).json({
                error: 'Topic not found',
                message: 'Topic not found'
            });
        }

        // Check permissions (creator or admin)
        if (!topic.creatorId.equals(user._id) && user.role !== 'Admin') {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Only the topic creator or admin can update this topic'
            });
        }

        // Update topic
        if (title) topic.title = title;
        if (description) topic.description = description;
        topic.updatedAt = new Date();

        await topic.save();

        res.status(200).json({
            message: 'Topic updated successfully',
            topic: topic
        });

    } catch (error) {
        console.error('Update topic error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to update topic'
        });
    }
});

/**
 * POST /api/topics/:topicId/subscribe
 * Subscribe to a topic
 */
router.post('/:topicId/subscribe', authenticate(), async (req, res) => {
    try {
        const { topicId } = req.params;
        const user = await User.findOne({ userId: req.user.userId });

        const topic = await Topic.findOne({ topicId });
        if (!topic) {
            return res.status(404).json({
                error: 'Topic not found',
                message: 'Topic not found'
            });
        }

        // Check if already subscribed
        if (topic.subscribers.includes(user._id)) {
            return res.status(400).json({
                error: 'Already subscribed',
                message: 'You are already subscribed to this topic'
            });
        }

        // Subscribe user
        topic.subscribers.push(user._id);
        await topic.save();

        // Update user profile
        await Profile.findOneAndUpdate(
            { userId: user._id },
            { 
                $addToSet: { subscribedTopics: topic._id },
                $push: { 
                    activityLog: {
                        action: 'topic_subscribed',
                        timestamp: new Date(),
                        details: { topicId: topic.topicId, title: topic.title }
                    }
                } 
            }
        );

        res.status(200).json({
            message: 'Subscribed to topic successfully',
            topic: {
                topicId: topic.topicId,
                title: topic.title,
                isSubscribed: true,
                subscriberCount: topic.subscribers.length
            }
        });

    } catch (error) {
        console.error('Subscribe error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to subscribe to topic'
        });
    }
});

/**
 * DELETE /api/topics/:topicId/subscribe
 * Unsubscribe from a topic
 */
router.delete('/:topicId/subscribe', authenticate(), async (req, res) => {
    try {
        const { topicId } = req.params;
        const user = await User.findOne({ userId: req.user.userId });

        const topic = await Topic.findOne({ topicId });
        if (!topic) {
            return res.status(404).json({
                error: 'Topic not found',
                message: 'Topic not found'
            });
        }

        // Check if subscribed
        if (!topic.subscribers.includes(user._id)) {
            return res.status(400).json({
                error: 'Not subscribed',
                message: 'You are not subscribed to this topic'
            });
        }

        // Unsubscribe user
        topic.subscribers = topic.subscribers.filter(subId => !subId.equals(user._id));
        await topic.save();

        // Update user profile
        await Profile.findOneAndUpdate(
            { userId: user._id },
            { 
                $pull: { subscribedTopics: topic._id },
                $push: { 
                    activityLog: {
                        action: 'topic_unsubscribed',
                        timestamp: new Date(),
                        details: { topicId: topic.topicId, title: topic.title }
                    }
                } 
            }
        );

        res.status(200).json({
            message: 'Unsubscribed from topic successfully',
            topic: {
                topicId: topic.topicId,
                title: topic.title,
                isSubscribed: false,
                subscriberCount: topic.subscribers.length
            }
        });

    } catch (error) {
        console.error('Unsubscribe error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to unsubscribe from topic'
        });
    }
});

/**
 * GET /api/topics/:topicId/help-requests
 * Get help requests for a topic
 */
router.get('/:topicId/help-requests', authenticate(), async (req, res) => {
    try {
        const { topicId } = req.params;
        const { status } = req.query;

        // Verify topic exists
        const topic = await Topic.findOne({ topicId });
        if (!topic) {
            return res.status(404).json({
                error: 'Topic not found',
                message: 'Topic not found'
            });
        }

        let query = { topicId: topic._id };

        // Filter by status if provided
        if (status) {
            query.status = status;
        }

        const helpRequests = await HelpRequest.find(query)
            .populate('studentId', 'userId name email')
            .populate('assignedTutorId', 'userId name email')
            .sort({ creationDate: -1 });

        // Check edit permissions
        const user = await User.findOne({ userId: req.user.userId });
        const helpRequestsWithPermissions = helpRequests.map(hr => ({
            ...hr.toObject(),
            canEdit: hr.studentId._id.equals(user._id) || req.user.role === 'Admin'
        }));

        res.status(200).json({
            helpRequests: helpRequestsWithPermissions,
            total: helpRequestsWithPermissions.length
        });

    } catch (error) {
        console.error('Get help requests error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to fetch help requests'
        });
    }
});

/**
 * POST /api/topics/:topicId/help-requests
 * Create a new help request
 */
router.post('/:topicId/help-requests', [
    authenticate(['Student']), // Only students can create help requests
    body('title')
        .isLength({ min: 5, max: 200 })
        .trim()
        .escape()
        .withMessage('Title must be between 5 and 200 characters'),
    body('content')
        .isLength({ min: 10, max: 5000 })
        .trim()
        .escape()
        .withMessage('Content must be between 10 and 5000 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { topicId } = req.params;
        const { title, content } = req.body;
        const student = await User.findOne({ userId: req.user.userId });

        // Verify topic exists
        const topic = await Topic.findOne({ topicId });
        if (!topic) {
            return res.status(404).json({
                error: 'Topic not found',
                message: 'Topic not found'
            });
        }

        // Generate request ID
        const requestCount = await HelpRequest.countDocuments();
        const requestId = `REQ${String(requestCount + 1).padStart(3, '0')}`;

        // Create new help request
        const newHelpRequest = new HelpRequest({
            requestId,
            studentId: student._id,
            topicId: topic._id,
            title,
            content
        });

        await newHelpRequest.save();

        // Add to user's profile activity
        await Profile.findOneAndUpdate(
            { userId: student._id },
            { 
                $push: { 
                    activityLog: {
                        action: 'help_request_created',
                        timestamp: new Date(),
                        details: { 
                            requestId: newHelpRequest.requestId, 
                            topicId: topic.topicId,
                            title: newHelpRequest.title 
                        }
                    }
                } 
            }
        );

        res.status(201).json({
            message: 'Help request created successfully',
            helpRequest: newHelpRequest
        });

    } catch (error) {
        console.error('Create help request error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to create help request'
        });
    }
});

/**
 * GET /api/subjects
 * Get all subjects
 */
router.get('/subjects/list', authenticate(), async (req, res) => {
    try {
        // In a real system, you'd have a Subject model
        // For now, we'll return a static list
        const subjects = [
            { subjectId: 'SUB001', name: 'Software Engineering', code: 'SEN381' },
            { subjectId: 'SUB002', name: 'Database Development', code: 'DBD381' },
            { subjectId: 'SUB003', name: 'Artificial Intelligence', code: 'AI381' },
            { subjectId: 'SUB004', name: 'Mathematics', code: 'MAT381' },
            { subjectId: 'SUB005', name: 'Network Development', code: 'NWD381' }
        ];

        res.status(200).json({
            subjects: subjects,
            total: subjects.length
        });

    } catch (error) {
        console.error('Get subjects error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to fetch subjects'
        });
    }
});

module.exports = router;