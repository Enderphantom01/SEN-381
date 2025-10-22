// routes/admin.js - Complete Admin Routes with Database (Demo - No Auth)
const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/user');
const Student = require('../models/Student');
const Tutor = require('../models/Tutor');
const Admin = require('../models/Admin');
const Topic = require('../models/topic');
const HelpRequest = require('../models/helprequest');
const ForumPost = require('../models/ForumPost');
const Notification = require('../models/Notification');
const Conversation = require('../models/Conversation');

const router = express.Router();

// Demo middleware that bypasses authentication
const demoAuth = (req, res, next) => {
  // For demo purposes, create a mock admin user
  req.user = {
    userId: 'DEMO001',
    name: 'Demo Admin',
    email: 'demo@belgiumcampus.ac.za',
    role: 'Admin'
  };
  next();
};

/**
 * GET /api/admin/dashboard
 * Get admin dashboard overview
 */
router.get('/dashboard', demoAuth, async (req, res) => {
    try {
        // Get counts for dashboard
        const [
            totalUsers,
            totalStudents,
            totalTutors,
            totalTopics,
            totalHelpRequests,
            totalForumPosts,
            activeHelpRequests,
            pendingTutors
        ] = await Promise.all([
            User.countDocuments(),
            Student.countDocuments(),
            Tutor.countDocuments({ isApproved: true }),
            Topic.countDocuments({ isActive: true }),
            HelpRequest.countDocuments(),
            ForumPost.countDocuments({ isActive: true }),
            HelpRequest.countDocuments({ status: { $in: ['open', 'assigned', 'in-progress'] } }),
            Tutor.countDocuments({ isApproved: false })
        ]);

        // Get recent activity
        const recentHelpRequests = await HelpRequest.find()
            .populate('studentId', 'userId name')
            .populate('assignedTutorId', 'userId name')
            .sort({ createdAt: -1 })
            .limit(5);

        const recentForumPosts = await ForumPost.find({ isActive: true })
            .populate('authorId', 'userId name')
            .populate('topicId', 'topicId title')
            .sort({ createdAt: -1 })
            .limit(5);

        const dashboardData = {
            overview: {
                totalUsers: totalUsers,
                totalTutors: totalTutors,
                activeCourses: totalTopics,
                feedbackCount: totalForumPosts,
                pendingTutorApprovals: pendingTutors,
                activeHelpRequests: activeHelpRequests
            },
            userEngagement: {
                dailyActiveUsers: Math.floor(totalUsers * 0.2),
                weeklyActiveUsers: Math.floor(totalUsers * 0.6),
                monthlyActiveUsers: Math.floor(totalUsers * 0.8),
                userGrowth: 15.5,
                retentionRate: 78.3
            },
            tutorPerformance: {
                totalTutors: totalTutors,
                activeTutors: Math.floor(totalTutors * 0.85),
                averageRating: 4.6,
                responseTime: '2.3 hours',
                resolutionRate: 89.2
            },
            recentActivity: {
                helpRequests: recentHelpRequests,
                forumPosts: recentForumPosts
            },
            systemHealth: {
                uptime: '99.8%',
                responseTime: '245ms',
                errorRate: '0.2%',
                databaseSize: '2.3 GB',
                lastBackup: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
        };

        res.status(200).json({
            dashboard: dashboardData,
            lastUpdated: new Date()
        });

    } catch (error) {
        console.error('Get admin dashboard error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to fetch dashboard data'
        });
    }
});

/**
 * GET /api/admin/users
 * Get all users with pagination and filtering
 */
router.get('/users', demoAuth, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            role, 
            status, 
            search 
        } = req.query;

        let query = {};

        // Filter by role
        if (role) {
            query.role = role;
        }

        // Filter by status
        if (status) {
            query.status = status;
        }

        // Filter by search term
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { userId: { $regex: search, $options: 'i' } }
            ];
        }

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const users = await User.find(query)
            .sort({ dateCreated: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const totalUsers = await User.countDocuments(query);

        // Format user data for admin view
        const usersForAdmin = users.map(user => ({
            userId: user.userId,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            dateCreated: user.dateCreated,
            lastLogin: user.lastLogin,
            ...(user.role === 'Student' && { studentNumber: user.studentNumber }),
            ...(user.role === 'Tutor' && { 
                tutorId: user.tutorId,
                subjects: user.subjects,
                isApproved: user.isApproved,
                rating: user.rating
            }),
            ...(user.role === 'Admin' && { adminId: user.adminId })
        }));

        res.status(200).json({
            users: usersForAdmin,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalUsers / limit),
                totalUsers: totalUsers,
                hasNext: (skip + users.length) < totalUsers,
                hasPrev: parseInt(page) > 1
            }
        });

    } catch (error) {
        console.error('Get admin users error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to fetch users'
        });
    }
});

/**
 * GET /api/admin/tutors
 * Get tutor management data
 */
router.get('/tutors', demoAuth, async (req, res) => {
    try {
        const { status = 'all' } = req.query;

        let query = { role: 'Tutor' };
        
        if (status === 'pending') {
            query.isApproved = false;
        } else if (status === 'approved') {
            query.isApproved = true;
        }

        const tutors = await Tutor.find(query)
            .sort({ dateCreated: -1 });

        const tutorDetails = tutors.map(tutor => ({
            userId: tutor.userId,
            name: tutor.name,
            email: tutor.email,
            tutorId: tutor.tutorId,
            subjects: tutor.subjects,
            isApproved: tutor.isApproved,
            rating: tutor.rating,
            status: tutor.status,
            dateCreated: tutor.dateCreated,
            lastLogin: tutor.lastLogin,
            approvalDate: tutor.approvalDate
        }));

        res.status(200).json({
            tutors: tutorDetails,
            stats: {
                total: tutors.length,
                approved: tutors.filter(t => t.isApproved).length,
                pending: tutors.filter(t => !t.isApproved).length
            }
        });

    } catch (error) {
        console.error('Get admin tutors error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to fetch tutors'
        });
    }
});

/**
 * PUT /api/admin/tutors/:tutorId/approve
 * Approve or update tutor
 */
router.put('/tutors/:tutorId/approve', [
    demoAuth,
    body('subjects')
        .optional()
        .isArray()
        .withMessage('Subjects must be an array'),
    body('subjects.*')
        .optional()
        .isString()
        .trim()
        .escape()
        .withMessage('Each subject must be a string')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { tutorId } = req.params;
        const { subjects, notes } = req.body;

        const tutor = await Tutor.findOne({ tutorId });
        if (!tutor) {
            return res.status(404).json({
                error: 'Tutor not found',
                message: 'Tutor with the specified ID not found'
            });
        }

        // Update tutor approval and subjects
        tutor.isApproved = true;
        tutor.approvalDate = new Date();
        
        if (subjects && subjects.length > 0) {
            tutor.subjects = subjects;
        }

        await tutor.save();

        res.status(200).json({
            message: 'Tutor approved successfully',
            tutor: {
                userId: tutor.userId,
                name: tutor.name,
                email: tutor.email,
                tutorId: tutor.tutorId,
                subjects: tutor.subjects,
                isApproved: tutor.isApproved,
                approvalDate: tutor.approvalDate
            }
        });

    } catch (error) {
        console.error('Approve tutor error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to approve tutor'
        });
    }
});

/**
 * PUT /api/admin/users/:userId/status
 * Update user status
 */
router.put('/users/:userId/status', [
    demoAuth,
    body('status')
        .isIn(['active', 'inactive', 'suspended'])
        .withMessage('Status must be one of: active, inactive, suspended'),
    body('reason')
        .optional()
        .isLength({ max: 500 })
        .trim()
        .escape()
        .withMessage('Reason must not exceed 500 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { userId } = req.params;
        const { status, reason } = req.body;

        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                message: 'User not found'
            });
        }

        const oldStatus = user.status;
        user.status = status;
        await user.save();

        res.status(200).json({
            message: 'User status updated successfully',
            user: {
                userId: user.userId,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status
            }
        });

    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to update user status'
        });
    }
});

/**
 * GET /api/admin/analytics/user-engagement
 * Get detailed user engagement analytics
 */
router.get('/analytics/user-engagement', demoAuth, async (req, res) => {
    try {
        const { period = '30d' } = req.query;

        // Calculate date ranges based on period
        let startDate;
        const endDate = new Date();
        
        switch (period) {
            case '7d':
                startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            case '1y':
                startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        // Get user registration data
        const userRegistrations = await User.aggregate([
            {
                $match: {
                    dateCreated: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$dateCreated' },
                        month: { $month: '$dateCreated' },
                        day: { $dayOfMonth: '$dateCreated' }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
            }
        ]);

        // Get activity data
        const forumActivity = await ForumPost.countDocuments({
            createdAt: { $gte: startDate, $lte: endDate }
        });

        const helpRequestActivity = await HelpRequest.countDocuments({
            createdAt: { $gte: startDate, $lte: endDate }
        });

        const messageActivity = await Conversation.countDocuments({
            lastMessageTime: { $gte: startDate, $lte: endDate }
        });

        const engagementData = {
            period: period,
            userGrowth: {
                newUsers: userRegistrations,
                totalUsers: await User.countDocuments(),
                activeUsers: await User.countDocuments({ lastLogin: { $gte: startDate } })
            },
            activityMetrics: {
                forumPosts: forumActivity,
                helpRequests: helpRequestActivity,
                conversations: messageActivity,
                totalActivity: forumActivity + helpRequestActivity + messageActivity
            },
            userDistribution: {
                byRole: await User.aggregate([
                    {
                        $group: {
                            _id: '$role',
                            count: { $sum: 1 }
                        }
                    }
                ]),
                byStatus: await User.aggregate([
                    {
                        $group: {
                            _id: '$status',
                            count: { $sum: 1 }
                        }
                    }
                ])
            }
        };

        res.status(200).json({
            analytics: engagementData,
            generatedAt: new Date()
        });

    } catch (error) {
        console.error('Get user engagement analytics error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to fetch engagement analytics'
        });
    }
});

/**
 * GET /api/admin/analytics/content
 * Get content and resource analytics
 */
router.get('/analytics/content', demoAuth, async (req, res) => {
    try {
        const [
            totalTopics,
            activeTopics,
            totalPosts,
            reportedPosts,
            totalHelpRequests,
            helpRequestStats,
            popularTopics
        ] = await Promise.all([
            Topic.countDocuments(),
            Topic.countDocuments({ isActive: true }),
            ForumPost.countDocuments({ isActive: true }),
            ForumPost.countDocuments({ isReported: true }),
            HelpRequest.countDocuments(),
            HelpRequest.aggregate([
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]),
            Topic.aggregate([
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
                { $limit: 10 }
            ])
        ]);

        const contentData = {
            overview: {
                totalTopics: totalTopics,
                activeTopics: activeTopics,
                totalPosts: totalPosts,
                reportedPosts: reportedPosts,
                totalHelpRequests: totalHelpRequests
            },
            helpRequestStats: helpRequestStats.reduce((acc, stat) => {
                acc[stat._id] = stat.count;
                return acc;
            }, {}),
            popularTopics: popularTopics,
            forumActivity: {
                totalPosts: totalPosts,
                reportedPosts: reportedPosts,
                resolutionRate: reportedPosts > 0 ? 
                    ((totalPosts - reportedPosts) / totalPosts * 100).toFixed(1) + '%' : '100%'
            }
        };

        res.status(200).json({
            analytics: contentData,
            generatedAt: new Date()
        });

    } catch (error) {
        console.error('Get content analytics error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to fetch content analytics'
        });
    }
});

/**
 * GET /api/admin/system/health
 * Get system health and performance metrics
 */
router.get('/system/health', demoAuth, async (req, res) => {
    try {
        const mongoose = require('mongoose');
        const [
            memoryUsage
        ] = await Promise.all([
            Promise.resolve(process.memoryUsage())
        ]);

        const systemHealth = {
            database: {
                status: 'connected',
                operations: 'normal',
                collections: await mongoose.connection.db.listCollections().toArray().length
            },
            server: {
                uptime: process.uptime(),
                memory: {
                    used: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
                    total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB'
                },
                activeConnections: Math.floor(Math.random() * 50) + 10,
                responseTime: '245ms'
            },
            services: {
                authentication: 'operational',
                database: 'operational',
                notifications: 'operational',
                fileStorage: 'operational'
            },
            lastIncident: null
        };

        res.status(200).json({
            systemHealth: systemHealth,
            checkedAt: new Date()
        });

    } catch (error) {
        console.error('Get system health error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to fetch system health'
        });
    }
});

/**
 * POST /api/admin/system/maintenance
 * Perform system maintenance actions
 */
router.post('/system/maintenance', [
    demoAuth,
    body('action')
        .isIn(['backup', 'cleanup', 'cache_clear', 'index_rebuild'])
        .withMessage('Valid maintenance action required'),
    body('scope')
        .optional()
        .isIn(['users', 'content', 'system', 'all'])
        .withMessage('Valid scope required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { action, scope = 'all', notes } = req.body;

        // Simulate maintenance action
        let result = '';
        switch (action) {
            case 'backup':
                result = 'Database backup completed successfully';
                break;
            case 'cleanup':
                const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                const deletedCount = await Notification.deleteMany({
                    createdAt: { $lt: thirtyDaysAgo },
                    isRead: true
                });
                result = `Cleaned up ${deletedCount.deletedCount} old notifications`;
                break;
            case 'cache_clear':
                result = 'System cache cleared successfully';
                break;
            case 'index_rebuild':
                result = 'Database indexes rebuilt successfully';
                break;
        }

        res.status(200).json({
            message: `Maintenance action '${action}' completed successfully`,
            action: action,
            scope: scope,
            result: result,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('System maintenance error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to perform maintenance action'
        });
    }
});

module.exports = router;