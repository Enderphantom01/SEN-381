// middleware/auth.js - Server-side JWT Management Middleware
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// In-memory session store (in production, use Redis or database)
const sessionStore = new Map();

// Secret key for JWT signing (should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'campuslearn_secret_key_2025';
const SESSION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a server-side session and return session ID
 */
const createSession = (user) => {
    const sessionId = uuidv4();
    const token = jwt.sign(
        { 
            userId: user.userId, 
            role: user.role,
            email: user.email 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
    );

    // Store session server-side only
    sessionStore.set(sessionId, {
        token,
        user: {
            userId: user.userId,
            role: user.role,
            email: user.email,
            name: user.name
        },
        createdAt: new Date(),
        lastActive: new Date()
    });

    // Clean up expired sessions periodically
    cleanupExpiredSessions();

    return sessionId;
};

/**
 * Validate session and return user data
 */
const validateSession = (sessionId) => {
    if (!sessionId || !sessionStore.has(sessionId)) {
        return null;
    }

    const session = sessionStore.get(sessionId);
    
    try {
        // Verify JWT token
        const decoded = jwt.verify(session.token, JWT_SECRET);
        
        // Update last active timestamp
        session.lastActive = new Date();
        sessionStore.set(sessionId, session);
        
        return session.user;
    } catch (error) {
        // Token expired or invalid
        sessionStore.delete(sessionId);
        return null;
    }
};

/**
 * Destroy session (logout)
 */
const destroySession = (sessionId) => {
    if (sessionStore.has(sessionId)) {
        sessionStore.delete(sessionId);
        return true;
    }
    return false;
};

/**
 * Clean up expired sessions
 */
const cleanupExpiredSessions = () => {
    const now = new Date();
    for (const [sessionId, session] of sessionStore.entries()) {
        try {
            jwt.verify(session.token, JWT_SECRET);
        } catch (error) {
            // Token expired, remove session
            sessionStore.delete(sessionId);
        }
    }
};

/**
 * Authentication middleware for protected routes
 */
const authenticate = (requiredRoles = []) => {
    return (req, res, next) => {
        const sessionId = req.headers['x-session-id'];
        
        if (!sessionId) {
            return res.status(401).json({
                error: 'Authentication required',
                message: 'No session provided'
            });
        }

        const user = validateSession(sessionId);
        
        if (!user) {
            return res.status(401).json({
                error: 'Invalid session',
                message: 'Session expired or invalid'
            });
        }

        // Check role-based authorization if required
        if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                message: `Required roles: ${requiredRoles.join(', ')}`
            });
        }

        // Attach user to request object
        req.user = user;
        req.sessionId = sessionId;
        
        next();
    };
};

/**
 * Optional authentication middleware (for public routes that have optional user context)
 */
const optionalAuth = (req, res, next) => {
    const sessionId = req.headers['x-session-id'];
    
    if (sessionId) {
        const user = validateSession(sessionId);
        if (user) {
            req.user = user;
            req.sessionId = sessionId;
        }
    }
    
    next();
};

module.exports = {
    createSession,
    validateSession,
    destroySession,
    authenticate,
    optionalAuth,
    sessionStore
};