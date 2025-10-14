// main.js - CampusLearn Backend Server (Fixed 404 handler for Express 5)
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3000;

// Global Middleware Configuration
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:4200'],
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API base endpoint
app.get('/api', (req, res) => {
    res.json({ 
        message: 'CampusLearn API', 
        status: 'Running',
        version: '1.0.0',
        endpoints: [
            '/api/auth',
            '/api/users', 
            '/api/topics',
            '/api/forum',
            '/api/messages',
            '/api/notifications',
            '/api/admin'
        ]
    });
});

// Import and use route modules with error handling
const loadRoutes = () => {
    try {
        console.log('Loading routes...');
        
        try {
            const authRoutes = require('./routes/auth');
            app.use('/api/auth', authRoutes);
            console.log('Auth routes loaded');
        } catch (error) {
            console.error('Failed to load auth routes:', error.message);
        }

        try {
            const userRoutes = require('./routes/users');
            app.use('/api/users', userRoutes);
            console.log('User routes loaded');
        } catch (error) {
            console.error('Failed to load user routes:', error.message);
        }

        try {
            const topicRoutes = require('./routes/topics');
            app.use('/api/topics', topicRoutes);
            console.log('Topic routes loaded');
        } catch (error) {
            console.error('Failed to load topic routes:', error.message);
        }

        try {
            const forumRoutes = require('./routes/forum');
            app.use('/api/forum', forumRoutes);
            console.log('Forum routes loaded');
        } catch (error) {
            console.error('Failed to load forum routes:', error.message);
        }

        try {
            const messageRoutes = require('./routes/messages');
            app.use('/api/messages', messageRoutes);
            console.log('Message routes loaded');
        } catch (error) {
            console.error('Failed to load message routes:', error.message);
        }

        try {
            const notificationModule = require('./routes/notifications');
            app.use('/api/notifications', notificationModule.router);
            console.log('Notification routes loaded');
        } catch (error) {
            console.error('Failed to load notification routes:', error.message);
        }

        try {
            const adminRoutes = require('./routes/admin');
            app.use('/api/admin', adminRoutes);
            console.log('Admin routes loaded');
        } catch (error) {
            console.error('Failed to load admin routes:', error.message);
        }

    } catch (error) {
        console.error('Error in route loading:', error);
    }
};

// Load routes
loadRoutes();

// 404 handler - FIXED for Express 5

app.use((req, res, next) => {
    res.status(404).json({
        error: 'Route not found',
        message: `The route ${req.originalUrl} does not exist.`,
        availableRoutes: ['/api', '/api/auth', '/api/users', '/api/topics', '/api/forum', '/api/messages', '/api/notifications', '/api/admin']
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    
    if (process.env.NODE_ENV === 'production') {
        return res.status(500).json({
            error: 'Internal Server Error',
            message: 'Something went wrong!'
        });
    }
    
    res.status(500).json({
        error: error.message,
        stack: error.stack
    });
});

// Server startup
const startServer = async () => {
    try {
        app.listen(PORT, () => {
            console.log(`=== CampusLearn Backend Server ===`);
            console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
            console.log(`Port: ${PORT}`);
            console.log(`Health check: http://localhost:${PORT}/health`);
            console.log(`API Base: http://localhost:${PORT}/api`);
            console.log(`=====================================`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Start server
startServer();

module.exports = app;