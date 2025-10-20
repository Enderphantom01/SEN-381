// routes/users.js - Complete User Management Routes with Database
const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const User = require('../models/user');
const Student = require('../models/Student');
const Tutor = require('../models/Tutor');
const Admin = require('../models/Admin');
const Profile = require('../models/Profile');
const Topic = require('../models/topic');

const router = express.Router();

/**
 * GET /api/users/profile
 * Get current user's profile
 */
router.get('/profile', authenticate(), async (req, res) => {
    try {
        const userId = req.user.userId;
        
        // Find user and profile data
        const user = await User.findOne({ userId });
        const profile = await Profile.findOne({ userId: user._id }).populate('subscribedTopics');

        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                message: 'User profile not found'
            });
        }

        // Return user profile data
        const userResponse = {
            userId: user.userId,
            name: user.name,
            email: user.email,
            role: user.role,
            phoneNumber: user.phoneNumber,
            status: user.status,
            lastLogin: user.lastLogin,
            dateCreated: user.dateCreated,
            ...(user.role === 'Student' && { 
                studentNumber: user.studentNumber,
                academicDetails: user.academicDetails
            }),
            ...(user.role === 'Tutor' && { 
                tutorId: user.tutorId,
                subjects: user.subjects,
                rating: user.rating,
                isApproved: user.isApproved
            }),
            ...(user.role === 'Admin' && { 
                adminId: user.adminId,
                permissions: user.permissions,
                accessLevel: user.accessLevel
            }),
            profile: profile || {
                bio: '',
                academicBackground: { qualifications: [], areasOfExpertise: [] },
                activityLog: [],
                subscribedTopics: []
            }
        };

        res.status(200).json({
            user: userResponse
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to fetch user profile'
        });
    }
});

/**
 * PUT /api/users/profile
 * Update user profile
 */
router.put('/profile', [
    authenticate(),
    body('name')
        .optional()
        .isLength({ min: 2, max: 100 })
        .trim()
        .escape()
        .withMessage('Name must be between 2 and 100 characters'),
    body('phoneNumber')
        .optional()
        .matches(/^(\+\d{1,3}[- ]?)?\d{10}$/)
        .withMessage('Valid phone number is required'),
    body('bio')
        .optional()
        .isLength({ max: 500 })
        .trim()
        .escape()
        .withMessage('Bio must not exceed 500 characters')
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

        const userId = req.user.userId;
        const { name, phoneNumber, bio, academicDetails } = req.body;

        // Find user and profile
        const user = await User.findOne({ userId });
        let profile = await Profile.findOne({ userId: user._id });

        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                message: 'User not found'
            });
        }

        // Update user basic info
        if (name) user.name = name;
        if (phoneNumber) user.phoneNumber = phoneNumber;
        if (academicDetails && user.role === 'Student') {
            user.academicDetails = academicDetails;
        }

        await user.save();

        // Update or create profile
        if (!profile) {
            profile = new Profile({
                userId: user._id,
                bio: bio || '',
                academicBackground: {
                    qualifications: [],
                    areasOfExpertise: []
                },
                activityLog: [],
                subscribedTopics: []
            });
        } else {
            if (bio !== undefined) profile.bio = bio;
        }

        // Add profile update activity
        profile.activityLog.push({
            action: 'updated_profile',
            timestamp: new Date(),
            details: { fields: Object.keys(req.body).filter(k => req.body[k] !== undefined) }
        });

        await profile.save();

        // Return updated profile
        const userResponse = {
            userId: user.userId,
            name: user.name,
            email: user.email,
            role: user.role,
            phoneNumber: user.phoneNumber,
            profile: profile
        };

        res.status(200).json({
            message: 'Profile updated successfully',
            user: userResponse
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to update profile'
        });
    }
});

/**
 * GET /api/users/:userId
 * Get specific user profile (admin access or own profile)
 */
router.get('/:userId', authenticate(), async (req, res) => {
    try {
        const { userId } = req.params;
        const requestingUser = req.user;

        // Users can only view their own profile unless they're admin
        if (userId !== requestingUser.userId && requestingUser.role !== 'Admin') {
            return res.status(403).json({
                error: 'Access denied',
                message: 'You can only view your own profile'
            });
        }

        const user = await User.findOne({ userId });
        const profile = await Profile.findOne({ userId: user._id });

        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                message: 'User not found'
            });
        }

        // Return appropriate data based on role and permissions
        const userResponse = {
            userId: user.userId,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            ...(requestingUser.role === 'Admin' && {
                phoneNumber: user.phoneNumber,
                lastLogin: user.lastLogin,
                dateCreated: user.dateCreated
            }),
            ...(user.role === 'Student' && { 
                studentNumber: user.studentNumber
            }),
            ...(user.role === 'Tutor' && { 
                tutorId: user.tutorId,
                subjects: user.subjects,
                rating: user.rating,
                isApproved: user.isApproved
            }),
            ...(requestingUser.role === 'Admin' && user.role === 'Admin' && { 
                adminId: user.adminId,
                permissions: user.permissions,
                accessLevel: user.accessLevel
            }),
            profile: profile ? {
                bio: profile.bio,
                academicBackground: profile.academicBackground,
                subscribedTopics: profile.subscribedTopics
            } : null
        };

        res.status(200).json({
            user: userResponse
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to fetch user data'
        });
    }
});

/**
 * GET /api/users/students
 * Get all students (admin only)
 */
router.get('/students', authenticate(['Admin']), async (req, res) => {
    try {
        const students = await Student.find({});
        
        const studentList = students.map(student => ({
            userId: student.userId,
            name: student.name,
            email: student.email,
            studentNumber: student.studentNumber,
            status: student.status,
            lastLogin: student.lastLogin,
            dateCreated: student.dateCreated,
            academicDetails: student.academicDetails
        }));

        res.status(200).json({
            students: studentList,
            total: studentList.length
        });

    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to fetch students'
        });
    }
});

/**
 * GET /api/users/tutors
 * Get all tutors (admin only)
 */
router.get('/tutors', authenticate(['Admin']), async (req, res) => {
    try {
        const { status } = req.query; // Optional filter: 'pending', 'approved'
        
        let query = { role: 'Tutor' };
        
        if (status === 'pending') {
            query.isApproved = false;
        } else if (status === 'approved') {
            query.isApproved = true;
        }

        const tutors = await Tutor.find(query);

        const tutorList = tutors.map(tutor => ({
            userId: tutor.userId,
            name: tutor.name,
            email: tutor.email,
            tutorId: tutor.tutorId,
            subjects: tutor.subjects,
            rating: tutor.rating,
            isApproved: tutor.isApproved,
            approvalDate: tutor.approvalDate,
            status: tutor.status,
            lastLogin: tutor.lastLogin,
            dateCreated: tutor.dateCreated
        }));

        res.status(200).json({
            tutors: tutorList,
            total: tutorList.length,
            ...(status && { filter: status })
        });

    } catch (error) {
        console.error('Get tutors error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to fetch tutors'
        });
    }
});

/**
 * PUT /api/users/tutors/:tutorId/approve
 * Approve a tutor (admin only)
 */
router.put('/tutors/:tutorId/approve', [
    authenticate(['Admin']),
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
        const { subjects } = req.body;
        const adminUser = req.user;

        const tutor = await Tutor.findOne({ tutorId });

        if (!tutor) {
            return res.status(404).json({
                error: 'Tutor not found',
                message: 'Tutor with the specified ID not found'
            });
        }

        if (tutor.isApproved) {
            return res.status(400).json({
                error: 'Tutor already approved',
                message: 'This tutor is already approved'
            });
        }

        // Update tutor approval status
        tutor.isApproved = true;
        tutor.approvalDate = new Date();
        
        // Update subjects if provided
        if (subjects && subjects.length > 0) {
            tutor.subjects = subjects;
        }

        // Log admin action
        await tutor.logAction('tutor_approved', tutorId, { subjects: tutor.subjects });

        // Add activity to tutor's profile
        await Profile.findOneAndUpdate(
            { userId: tutor._id },
            { 
                $push: { 
                    activityLog: {
                        action: 'tutor_approved',
                        timestamp: new Date(),
                        details: { approvedBy: adminUser.name, subjects: tutor.subjects }
                    }
                } 
            }
        );

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
 * PUT /api/users/:userId/status
 * Update user status (admin only - activate/deactivate/suspend)
 */
router.put('/:userId/status', [
    authenticate(['Admin']),
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
        const adminUser = req.user;

        const user = await User.findOne({ userId });

        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                message: 'User not found'
            });
        }

        const oldStatus = user.status;
        user.status = status;

        // Log admin action if user is admin
        if (user.role === 'Admin') {
            await user.logAction('status_updated', userId, { 
                from: oldStatus, 
                to: status, 
                reason: reason 
            });
        }

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
 * POST /api/users/tutors/apply
 * Apply to become a tutor (student only)
 */
router.post('/tutors/apply', [
    authenticate(['Student']),
    body('subjects')
        .isArray({ min: 1 })
        .withMessage('At least one subject is required'),
    body('subjects.*')
        .isString()
        .trim()
        .escape()
        .withMessage('Each subject must be a string'),
    body('qualifications')
        .optional()
        .isArray()
        .withMessage('Qualifications must be an array'),
    body('bio')
        .optional()
        .isLength({ max: 500 })
        .trim()
        .escape()
        .withMessage('Bio must not exceed 500 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { subjects, qualifications, bio } = req.body;
        const studentUser = req.user;

        // Check if user is already a tutor
        const user = await User.findOne({ userId: studentUser.userId });
        if (user.role === 'Tutor') {
            return res.status(400).json({
                error: 'Already a tutor',
                message: 'You are already registered as a tutor'
            });
        }

        // Get tutor count for ID generation
        const tutorCount = await Tutor.countDocuments();
        const tutorId = `T${String(tutorCount + 1).padStart(3, '0')}`;

        // Convert student to tutor applicant
        const updatedUser = await User.findOneAndUpdate(
            { userId: studentUser.userId },
            { 
                $set: { 
                    role: 'Tutor',
                    tutorId: tutorId,
                    subjects: subjects,
                    isApproved: false,
                    rating: 0
                } 
            },
            { new: true }
        );

        // Update profile with tutor application info
        await Profile.findOneAndUpdate(
            { userId: user._id },
            { 
                $set: {
                    bio: bio || '',
                    'academicBackground.areasOfExpertise': subjects
                },
                $push: { 
                    activityLog: {
                        action: 'tutor_application_submitted',
                        timestamp: new Date(),
                        details: { subjects }
                    }
                } 
            },
            { upsert: true, new: true }
        );

        // Add qualifications if provided
        if (qualifications && qualifications.length > 0) {
            await Profile.findOneAndUpdate(
                { userId: user._id },
                { 
                    $set: {
                        'academicBackground.qualifications': qualifications
                    }
                }
            );
        }

        res.status(201).json({
            message: 'Tutor application submitted successfully',
            application: {
                tutorId: tutorId,
                subjects: subjects,
                status: 'pending_approval'
            }
        });

    } catch (error) {
        console.error('Tutor application error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to submit tutor application'
        });
    }
});

module.exports = router;