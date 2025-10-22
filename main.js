// main.js - CampusLearn Backend Server with MongoDB Connection and Socket.IO

require('dotenv').config();

console.log('🔧 Environment Variables Check:');
console.log('🔧 NODE_ENV:', process.env.NODE_ENV);
console.log('🔧 GEMINI_API_KEY available:', !!process.env.GEMINI_API_KEY);
console.log('🔧 GEMINI_API_KEY (first 10 chars):', process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 10) + '...' : 'NOT FOUND');
console.log('🔧 ALLOWED_ORIGINS:', process.env.ALLOWED_ORIGINS);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

// Socket.IO Configuration
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:4200'],
    methods: ['GET', 'POST'],
    credentials: false
  }
});

// MongoDB Connection
const MONGODB_URI = 'mongodb://localhost:27017/campuslearnofficial';

const connectToDatabase = async () => {
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB: campuslearnofficial');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

// Socket.IO Connection Handling

const connectedUsers = new Map();

io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.id}`);

    // User joins with their user ID
    socket.on('user_connected', (userId) => {
        connectedUsers.set(userId, socket.id);
        console.log(`👤 User ${userId} connected with socket ${socket.id}`);
        
        // Broadcast online status to all connected clients
        socket.broadcast.emit('user_status_changed', {
            userId: userId,
            status: 'online'
        });
    });

    // Handle sending messages
   // Handle sending messages
socket.on('send_message', async (messageData) => {
    try {
        const { senderId, receiverId, text, conversationId } = messageData;
        
        console.log(`💬 Message from ${senderId} to ${receiverId}: ${text}`);
        
        // Check if this is a message to the AI assistant
        if (receiverId === 'ai-assistant') {
            console.log(`🤖 AI Assistant message received: ${text}`);
            
            // Don't save AI messages to database, just acknowledge receipt
            socket.emit('message_sent', {
                _id: `ai-${Date.now()}`,
                conversationId: conversationId,
                senderId: senderId,
                receiverId: receiverId,
                text: text,
                timestamp: new Date(),
                status: 'sent'
            });
            
            console.log(`✅ AI message acknowledged (not stored in DB)`);
            return; // Stop further processing for AI messages
        }
        
        // Save message to database with correct field names (only for real users)
        const Message = require('./backend/models/Message');
        const newMessage = new Message({
            conversationId: conversationId,
            senderId: senderId,
            receiverId: receiverId,
            text: text, // Using 'text' instead of 'content'
            status: 'sent',
            timestamp: new Date()
        });

        const savedMessage = await newMessage.save();
        
        // Emit to sender (confirmation)
        socket.emit('message_sent', {
            _id: savedMessage._id,
            conversationId: savedMessage.conversationId,
            senderId: savedMessage.senderId,
            receiverId: savedMessage.receiverId,
            text: savedMessage.text,
            timestamp: savedMessage.createdAt,
            status: 'sent'
        });

        // Emit to receiver if online
        const receiverSocketId = connectedUsers.get(receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('new_message', {
                _id: savedMessage._id,
                conversationId: savedMessage.conversationId,
                senderId: savedMessage.senderId,
                receiverId: savedMessage.receiverId,
                text: savedMessage.text,
                timestamp: savedMessage.createdAt,
                status: 'received'
            });
            console.log(`📤 Message delivered to online user ${receiverId}`);
        } else {
            console.log(`📭 User ${receiverId} is offline, message stored`);
        }

    } catch (error) {
        console.error('❌ Error sending message:', error);
        socket.emit('message_error', {
            error: 'Failed to send message',
            details: error.message
        });
    }
});
// Handle AI-specific messages
socket.on('send_ai_message', async (messageData) => {
    try {
        const { senderId, text, conversationId } = messageData;
        
        console.log(`🤖 AI Message from ${senderId}: ${text}`);
        
        // Acknowledge AI message receipt
        socket.emit('ai_message_received', {
            _id: `ai-${Date.now()}`,
            conversationId: conversationId,
            senderId: senderId,
            receiverId: 'ai-assistant',
            text: text,
            timestamp: new Date(),
            status: 'received'
        });
        
        console.log(`✅ AI message processed`);
        
    } catch (error) {
        console.error('❌ Error processing AI message:', error);
        socket.emit('message_error', {
            error: 'Failed to process AI message',
            details: error.message
        });
    }
});

    // Handle typing indicators
    socket.on('typing_start', (data) => {
        const receiverSocketId = connectedUsers.get(data.receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('user_typing', {
                senderId: data.senderId,
                isTyping: true
            });
        }
    });

    socket.on('typing_stop', (data) => {
        const receiverSocketId = connectedUsers.get(data.receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit('user_typing', {
                senderId: data.senderId,
                isTyping: false
            });
        }
    });

    // Handle message read receipts
    socket.on('mark_as_read', async (data) => {
        try {
            const Message = require('./backend/models/Message');
            await Message.updateMany(
                {
                    conversationId: data.conversationId,
                    receiverId: data.userId,
                    status: 'received'
                },
                {
                    $set: { status: 'read' }
                }
            );
            
            // Notify sender that messages were read
            const senderSocketId = connectedUsers.get(data.senderId);
            if (senderSocketId) {
                io.to(senderSocketId).emit('messages_read', {
                    conversationId: data.conversationId,
                    readerId: data.userId
                });
            }
        } catch (error) {
            console.error('❌ Error marking messages as read:', error);
        }
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
        // Find and remove disconnected user
        for (let [userId, socketId] of connectedUsers.entries()) {
            if (socketId === socket.id) {
                connectedUsers.delete(userId);
                console.log(`👤 User ${userId} disconnected`);
                
                // Broadcast offline status
                socket.broadcast.emit('user_status_changed', {
                    userId: userId,
                    status: 'offline'
                });
                break;
            }
        }
        console.log(`🔌 User disconnected: ${socket.id}`);
    });
});

// Create uploads directory if it doesn't exist
const createUploadsDirectory = () => {
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('✅ Created uploads directory');
    }
};

// Global Middleware Configuration
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            mediaSrc: ["'self'", "data:", "https:", "http:"],
            connectSrc: ["'self'", "https:", "http:", "ws:", "wss:"]
        },
    },
    crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:4200'],
    credentials: false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Session-Id', 'x-session-id']
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Compression middleware
app.use(compression());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.pdf')) {
            res.setHeader('Content-Type', 'application/pdf');
        } else if (path.endsWith('.pptx')) {
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
        } else if (path.endsWith('.md')) {
            res.setHeader('Content-Type', 'text/markdown');
        }
    }
}));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        database: dbStatus,
        connectedUsers: connectedUsers.size
    });
});

// API base endpoint
app.get('/api', (req, res) => {
    res.json({ 
        message: 'CampusLearn API', 
        status: 'Running',
        version: '1.0.0',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        connectedUsers: connectedUsers.size,
        endpoints: [
    '/api',
    '/api/auth', 
    '/api/users',
    '/api/topics',
    '/api/forum',
    '/api/messages', 
    '/api/notifications',
    '/api/admin',
    '/api/courses',
    '/api/modules',
    '/api/content',
    '/api/ai'  // Add this line
]
    });
});

// Import and use route modules with error handling
const loadRoutes = () => {
    try {
        console.log('Loading routes...');
        
        try {
            const authRoutes = require('./backend/routes/auth');
            app.use('/api/auth', authRoutes);
            console.log('✓ Auth routes loaded');
        } catch (error) {
            console.error('✗ Failed to load auth routes:', error.message);
        }

        try {
            const userRoutes = require('./backend/routes/users');
            app.use('/api/users', userRoutes);
            console.log('✓ User routes loaded');
        } catch (error) {
            console.error('✗ Failed to load user routes:', error.message);
        }

        try {
            const topicRoutes = require('./backend/routes/topics');
            app.use('/api/topics', topicRoutes);
            console.log('✓ Topic routes loaded');
        } catch (error) {
            console.error('✗ Failed to load topic routes:', error.message);
        }

        try {
            const forumRoutes = require('./backend/routes/forum');
            app.use('/api/forum', forumRoutes);
            console.log('✓ Forum routes loaded');
        } catch (error) {
            console.error('✗ Failed to load forum routes:', error.message);
        }

        try {
            const messageRoutes = require('./backend/routes/messages');
            app.use('/api/messages', messageRoutes);
            console.log('✓ Message routes loaded');
        } catch (error) {
            console.error('✗ Failed to load message routes:', error.message);
        }

        try {
            const notificationModule = require('./backend/routes/notifications');
            app.use('/api/notifications', notificationModule.router);
            console.log('✓ Notification routes loaded');
        } catch (error) {
            console.error('✗ Failed to load notification routes:', error.message);
        }

        try {
            const adminRoutes = require('./backend/routes/admin');
            app.use('/api/admin', adminRoutes);
            console.log('✓ Admin routes loaded');
        } catch (error) {
            console.error('✗ Failed to load admin routes:', error.message);
        }

        try {
            const courseRoutes = require('./backend/routes/courses');
            app.use('/api/courses', courseRoutes);
            console.log('✓ Course routes loaded');
        } catch (error) {
            console.error('✗ Failed to load course routes:', error.message);
        }

        try {
            const moduleRoutes = require('./backend/routes/modules');
            app.use('/api/modules', moduleRoutes);
            console.log('✓ Module routes loaded');
        } catch (error) {
            console.error('✗ Failed to load module routes:', error.message);
        }

        try {
            const contentRoutes = require('./backend/routes/content');
            app.use('/api/content', contentRoutes);
            console.log('✓ Content routes loaded');
        } catch (error) {
            console.error('✗ Failed to load content routes:', error.message);
        }
        try {
            const aiRoutes = require('./backend/routes/ai');
             app.use('/api/ai', aiRoutes);
             console.log('✓ AI routes loaded');
        } catch (error) {
             console.error('✗ Failed to load AI routes:', error.message);
        }

    } catch (error) {
        console.error('Error in route loading:', error);
    }
};

// Load routes
loadRoutes();

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        message: `The route ${req.originalUrl} does not exist.`,
        availableRoutes: [
            '/api', '/api/auth', '/api/users', '/api/topics', '/api/forum', 
            '/api/messages', '/api/notifications', '/api/admin',
            '/api/courses', '/api/modules', '/api/content'
        ]
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    
    if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            error: 'File too large',
            message: 'File size exceeds the allowed limit of 50MB'
        });
    }
    
    if (error.message.includes('Invalid file type')) {
        return res.status(400).json({
            error: 'Invalid file type',
            message: 'The uploaded file type is not supported'
        });
    }
    
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
        // Connect to database first
        await connectToDatabase();
        
        // Create uploads directory
        createUploadsDirectory();
        
        // Then start the server
        server.listen(PORT, () => {
            console.log(`=== CampusLearn Backend Server ===`);
            console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
            console.log(`Port: ${PORT}`);
            console.log(`WebSocket: ws://localhost:${PORT}`);
            console.log(`Database: ${MONGODB_URI}`);
            console.log(`Uploads directory: ${path.join(__dirname, 'uploads')}`);
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
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await mongoose.connection.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    await mongoose.connection.close();
    process.exit(0);
});

// Start server
startServer();

module.exports = app;
