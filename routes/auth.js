// routes/auth.js - Complete Authentication Routes with Database
const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { createSession, destroySession, authenticate } = require('../middleware/auth');
const User = require('../models/user');
const Student = require('../models/Student');
const Tutor = require('../models/Tutor');
const Admin = require('../models/Admin');
const Profile = require('../models/Profile');

const router = express.Router();

/**
 * POST /api/auth/login
 * Authenticate user and create server-side session
 */
router.post('/login', [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required')
        .custom((value) => {
            if (!value.endsWith('@belgiumcampus.ac.za')) {
                throw new Error('Only Belgium Campus email addresses are allowed');
            }
            return true;
        }),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters')
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

        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(401).json({
                error: 'Authentication failed',
                message: 'Invalid email or password'
            });
        }

        // Check user status
        if (user.status !== 'active') {
            return res.status(403).json({
                error: 'Account suspended',
                message: 'Your account has been suspended. Please contact administration.'
            });
        }

        // Verify password
        const isValidPassword = await user.comparePassword(password);
        
        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Authentication failed',
                message: 'Invalid email or password'
            });
        }

        // Update last login
        await user.updateLastLogin();

        // Create server-side session
        const sessionId = createSession(user);

        // Return user info (without password)
        const userResponse = {
            userId: user.userId,
            name: user.name,
            email: user.email,
            role: user.role,
            phoneNumber: user.phoneNumber,
            status: user.status,
            lastLogin: user.lastLogin,
            ...(user.role === 'Student' && { studentNumber: user.studentNumber }),
            ...(user.role === 'Tutor' && { 
                tutorId: user.tutorId, 
                subjects: user.subjects,
                isApproved: user.isApproved,
                rating: user.rating 
            }),
            ...(user.role === 'Admin' && { adminId: user.adminId })
        };

        res.status(200).json({
            message: 'Login successful',
            user: userResponse,
            sessionId: sessionId
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Authentication service unavailable'
        });
    }
});

/**
 * POST /api/auth/register
 * Register new student account
 */
router.post('/register', [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required')
        .custom((value) => {
            if (!value.endsWith('@belgiumcampus.ac.za')) {
                throw new Error('Only Belgium Campus email addresses are allowed');
            }
            return true;
        }),
    body('firstName')
        .isLength({ min: 2 })
        .trim()
        .escape()
        .withMessage('First name is required'),
    body('lastName')
        .isLength({ min: 2 })
        .trim()
        .escape()
        .withMessage('Last name is required'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    body('phoneNumber')
        .matches(/^(\+\d{1,3}[- ]?)?\d{10}$/)
        .withMessage('Valid phone number is required')
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

        const { email, firstName, lastName, password, phoneNumber } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                error: 'Registration failed',
                message: 'User with this email already exists'
            });
        }

        // Generate user ID
        const userCount = await User.countDocuments();
        const userId = `S${String(userCount + 1).padStart(3, '0')}`;
        const studentNumber = userId;

        // Create user
        const newUser = new Student({
            userId,
            name: `${firstName} ${lastName}`,
            email,
            password,
            phoneNumber,
            studentNumber,
            academicDetails: {
                degree: 'BCom IT', // Default, can be updated later
                yearOfStudy: 1,
                subjects: []
            }
        });

        await newUser.save();

        // Create profile
        const newProfile = new Profile({
            userId: newUser._id,
            bio: '',
            academicBackground: {
                qualifications: [],
                areasOfExpertise: []
            },
            activityLog: [{
                action: 'account_created',
                timestamp: new Date(),
                details: { method: 'email' }
            }],
            subscribedTopics: []
        });

        await newProfile.save();

        // Create session
        const sessionId = createSession(newUser);

        // Return user info
        const userResponse = {
            userId: newUser.userId,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            studentNumber: newUser.studentNumber,
            phoneNumber: newUser.phoneNumber
        };

        res.status(201).json({
            message: 'Registration successful',
            user: userResponse,
            sessionId: sessionId
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Registration service unavailable'
        });
    }
});

/**
 * POST /api/auth/logout
 * Destroy server-side session
 */
router.post('/logout', authenticate(), (req, res) => {
    try {
        const sessionId = req.sessionId;
        
        if (destroySession(sessionId)) {
            res.status(200).json({
                message: 'Logout successful'
            });
        } else {
            res.status(400).json({
                error: 'Logout failed',
                message: 'Session not found'
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Logout service unavailable'
        });
    }
});

/**
 * GET /api/auth/me
 * Get current user info from session
 */
router.get('/me', authenticate(), async (req, res) => {
    try {
        const userId = req.user.userId;
        
        // Find user in database
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                message: 'User account not found'
            });
        }

        // Find user profile
        const profile = await Profile.findOne({ userId: user._id });

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
                isApproved: user.isApproved,
                rating: user.rating
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
        console.error('Get user error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to fetch user data'
        });
    }
});

/**
 * POST /api/auth/refresh
 * Refresh session (extend expiry)
 */
router.post('/refresh', authenticate(), (req, res) => {
    try {
        // Session is automatically refreshed in validateSession
        res.status(200).json({
            message: 'Session refreshed',
            user: req.user
        });
    } catch (error) {
        console.error('Session refresh error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to refresh session'
        });
    }
});

/**
 * POST /api/auth/forgot-password
 * Initiate password reset process
 */
router.post('/forgot-password', [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required')
        .custom((value) => {
            if (!value.endsWith('@belgiumcampus.ac.za')) {
                throw new Error('Only Belgium Campus email addresses are allowed');
            }
            return true;
        })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { email } = req.body;

        // Find user by email
        const user = await User.findOne({ email });
        
        // Always return success to prevent email enumeration
        if (!user) {
            return res.status(200).json({
                message: 'If an account with that email exists, a password reset link has been sent.'
            });
        }

        // In production, you would:
        // 1. Generate a reset token
        // 2. Save it to the user with expiry
        // 3. Send email with reset link
        
        // For now, we'll just return success
        res.status(200).json({
            message: 'If an account with that email exists, a password reset link has been sent.'
        });

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to process password reset'
        });
    }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password', [
    body('token')
        .isLength({ min: 1 })
        .withMessage('Reset token is required'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { token, password } = req.body;

        // In production, you would:
        // 1. Verify the reset token
        // 2. Find user by valid token
        // 3. Update password
        // 4. Invalidate the used token
        
        // For now, we'll return a placeholder response
        res.status(200).json({
            message: 'Password reset functionality will be implemented with email service'
        });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to reset password'
        });
    }
});

/**
 * POST /api/auth/change-password
 * Change password while logged in
 */
router.post('/change-password', [
    authenticate(),
    body('currentPassword')
        .isLength({ min: 1 })
        .withMessage('Current password is required'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { currentPassword, newPassword } = req.body;
        const userId = req.user.userId;

        // Find user
        const user = await User.findOne({ userId });
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                message: 'User account not found'
            });
        }

        // Verify current password
        const isValidPassword = await user.comparePassword(currentPassword);
        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Invalid password',
                message: 'Current password is incorrect'
            });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        // Add to activity log
        await Profile.findOneAndUpdate(
            { userId: user._id },
            { 
                $push: { 
                    activityLog: {
                        action: 'password_changed',
                        timestamp: new Date(),
                        details: { method: 'self_service' }
                    }
                } 
            }
        );

        res.status(200).json({
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to change password'
        });
    }
});

module.exports = router;