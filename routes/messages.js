// routes/messages.js - Complete Messaging Routes with Database
const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const { sendNotification } = require('./notifications');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/user');
const HelpRequest = require('../models/helprequest');

const router = express.Router();

/**
 * GET /api/messages/conversations
 * Get all conversations for the current user
 */
router.get('/conversations', authenticate(), async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.user.userId });

        const conversations = await Conversation.find({
            participants: user._id,
            isActive: true
        })
            .populate('participants', 'userId name email role')
            .sort({ lastMessageTime: -1 });

        const conversationsWithDetails = conversations.map(conv => {
            const otherParticipant = conv.participants.find(
                participant => !participant._id.equals(user._id)
            );

            return {
                conversationId: conv.conversationId,
                otherParticipant: {
                    userId: otherParticipant.userId,
                    name: otherParticipant.name,
                    role: otherParticipant.role,
                    email: otherParticipant.email
                },
                lastMessage: conv.lastMessage,
                lastMessageTime: conv.lastMessageTime,
                unreadCount: conv.unreadCount,
                isActive: conv.isActive
            };
        });

        res.status(200).json({
            conversations: conversationsWithDetails,
            total: conversationsWithDetails.length
        });

    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to fetch conversations'
        });
    }
});

/**
 * GET /api/messages/conversations/:conversationId
 * Get messages for a specific conversation
 */
router.get('/conversations/:conversationId', authenticate(), async (req, res) => {
    try {
        const { conversationId } = req.params;
        const user = await User.findOne({ userId: req.user.userId });

        // Verify user is part of conversation
        const conversation = await Conversation.findOne({
            conversationId,
            participants: user._id
        }).populate('participants', 'userId name email role');

        if (!conversation) {
            return res.status(404).json({
                error: 'Conversation not found',
                message: 'Conversation not found or access denied'
            });
        }

        // Get messages for this conversation
        const messages = await Message.find({ conversationId: conversation._id })
            .populate('senderId', 'userId name email')
            .populate('receiverId', 'userId name email')
            .sort({ createdAt: 1 });

        // Mark messages as read when user views them
        const unreadMessages = messages.filter(msg => 
            msg.receiverId._id.equals(user._id) && !msg.isRead
        );

        if (unreadMessages.length > 0) {
            await Message.updateMany(
                {
                    _id: { $in: unreadMessages.map(msg => msg._id) },
                    receiverId: user._id
                },
                { $set: { isRead: true } }
            );

            // Update conversation unread count
            conversation.unreadCount = Math.max(0, conversation.unreadCount - unreadMessages.length);
            await conversation.save();
        }

        // Get other participant details
        const otherParticipant = conversation.participants.find(
            participant => !participant._id.equals(user._id)
        );

        res.status(200).json({
            conversation: {
                conversationId: conversation.conversationId,
                otherParticipant: {
                    userId: otherParticipant.userId,
                    name: otherParticipant.name,
                    role: otherParticipant.role
                },
                messages: messages.map(msg => ({
                    messageId: msg.messageId,
                    senderId: msg.senderId.userId,
                    senderName: msg.senderId.name,
                    receiverId: msg.receiverId.userId,
                    receiverName: msg.receiverId.name,
                    content: msg.content,
                    timestamp: msg.createdAt,
                    isRead: msg.isRead,
                    isOwnMessage: msg.senderId._id.equals(user._id),
                    attachments: msg.attachments,
                    messageType: msg.messageType
                }))
            }
        });

    } catch (error) {
        console.error('Get conversation messages error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to fetch conversation messages'
        });
    }
});

/**
 * POST /api/messages/conversations
 * Start a new conversation or get existing one
 */
router.post('/conversations', [
    authenticate(),
    body('receiverId')
        .isLength({ min: 1 })
        .withMessage('Receiver ID is required'),
    body('helpRequestId')
        .optional()
        .isLength({ min: 1 })
        .withMessage('Help request ID must be valid')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { receiverId, helpRequestId } = req.body;
        const sender = await User.findOne({ userId: req.user.userId });

        // Check if receiver exists
        const receiver = await User.findOne({ userId: receiverId });
        if (!receiver) {
            return res.status(404).json({
                error: 'User not found',
                message: 'Receiver user not found'
            });
        }

        // Check if conversation already exists
        const existingConversation = await Conversation.findOne({
            participants: { $all: [sender._id, receiver._id] },
            isActive: true
        });

        if (existingConversation) {
            return res.status(200).json({
                message: 'Conversation already exists',
                conversationId: existingConversation.conversationId,
                isNew: false
            });
        }

        // Generate conversation ID
        const conversationCount = await Conversation.countDocuments();
        const conversationId = `CONV${String(conversationCount + 1).padStart(3, '0')}`;

        // Create new conversation
        const newConversation = new Conversation({
            conversationId,
            participants: [sender._id, receiver._id],
            createdBy: sender._id
        });

        await newConversation.save();

        // If this is for a help request, update the help request
        if (helpRequestId) {
            const helpRequest = await HelpRequest.findOne({ requestId: helpRequestId });
            if (helpRequest) {
                helpRequest.assignedTutorId = receiver._id;
                helpRequest.status = 'assigned';
                await helpRequest.save();

                // Notify student about tutor assignment
                await sendNotification({
                    recipientId: helpRequest.studentId,
                    type: 'help_request_assigned',
                    title: 'Tutor Assigned to Your Help Request',
                    content: `${receiver.name} has been assigned to help with your request: ${helpRequest.title}`,
                    relatedEntity: {
                        type: 'help_request',
                        id: helpRequest._id
                    }
                });
            }
        }

        res.status(201).json({
            message: 'Conversation created successfully',
            conversationId: newConversation.conversationId,
            isNew: true,
            receiver: {
                userId: receiver.userId,
                name: receiver.name,
                role: receiver.role
            }
        });

    } catch (error) {
        console.error('Create conversation error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to create conversation'
        });
    }
});

/**
 * POST /api/messages/send
 * Send a message in a conversation
 */
router.post('/send', [
    authenticate(),
    body('conversationId')
        .isLength({ min: 1 })
        .withMessage('Conversation ID is required'),
    body('content')
        .isLength({ min: 1, max: 5000 })
        .trim()
        .escape()
        .withMessage('Message content must be between 1 and 5000 characters'),
    body('attachments')
        .optional()
        .isArray()
        .withMessage('Attachments must be an array')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { conversationId, content, attachments = [] } = req.body;
        const sender = await User.findOne({ userId: req.user.userId });

        // Verify conversation exists and user is participant
        const conversation = await Conversation.findOne({
            conversationId,
            participants: sender._id
        });

        if (!conversation) {
            return res.status(404).json({
                error: 'Conversation not found',
                message: 'Conversation not found or access denied'
            });
        }

        const receiverId = conversation.participants.find(
            participantId => !participantId.equals(sender._id)
        );

        // Generate message ID
        const messageCount = await Message.countDocuments();
        const messageId = `MSG${String(messageCount + 1).padStart(3, '0')}`;

        // Create new message
        const newMessage = new Message({
            messageId,
            conversationId: conversation._id,
            senderId: sender._id,
            receiverId: receiverId,
            content,
            attachments
        });

        await newMessage.save();

        // Update conversation
        conversation.lastMessage = content.length > 100 ? content.substring(0, 100) + '...' : content;
        conversation.lastMessageTime = new Date();
        conversation.unreadCount += 1;
        await conversation.save();

        // Get receiver details for notification
        const receiver = await User.findById(receiverId);

        // Send notification (in-app and email)
        await sendNotification({
            recipientId: receiver._id,
            type: 'new_message',
            title: `New message from ${sender.name}`,
            content: content.length > 100 ? content.substring(0, 100) + '...' : content,
            relatedEntity: {
                type: 'conversation',
                id: conversation._id
            },
            emailSubject: `New message from ${sender.name} - CampusLearn`,
            emailBody: `
                <h2>You have a new message on CampusLearn</h2>
                <p><strong>From:</strong> ${sender.name}</p>
                <p><strong>Message:</strong> ${content}</p>
                <p><a href="https://campuslearn.belgiumcampus.ac.za/messages" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Message</a></p>
                <hr>
                <p><small>This is an automated notification from CampusLearn. Please do not reply to this email.</small></p>
            `
        });

        res.status(201).json({
            message: 'Message sent successfully',
            message: {
                messageId: newMessage.messageId,
                senderId: sender.userId,
                senderName: sender.name,
                content: newMessage.content,
                timestamp: newMessage.createdAt,
                isRead: newMessage.isRead,
                attachments: newMessage.attachments
            }
        });

    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to send message'
        });
    }
});

/**
 * POST /api/messages/ai-assistant
 * Send message to AI assistant
 */
router.post('/ai-assistant', [
    authenticate(),
    body('content')
        .isLength({ min: 1, max: 5000 })
        .trim()
        .escape()
        .withMessage('Message content must be between 1 and 5000 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { content } = req.body;
        const user = await User.findOne({ userId: req.user.userId });

        // In a real implementation, this would call the Azure AI services
        // For now, we'll simulate an AI response with basic logic

        let aiResponse = '';
        
        // Simple keyword-based responses for demonstration
        if (content.toLowerCase().includes('sql') || content.toLowerCase().includes('database')) {
            aiResponse = `I can help with SQL and database concepts. For SQL joins, remember that INNER JOIN returns matching records, LEFT JOIN returns all records from the left table, and RIGHT JOIN returns all records from the right table. Would you like me to explain a specific concept in more detail, or would you prefer to connect with a human tutor for personalized help?`;
        } else if (content.toLowerCase().includes('javascript') || content.toLowerCase().includes('programming')) {
            aiResponse = `I can assist with JavaScript and programming concepts. JavaScript is a versatile language used for both frontend and backend development. Key concepts include variables, functions, objects, and asynchronous programming. For more specific help, I recommend checking the course materials or connecting with a tutor who specializes in programming.`;
        } else if (content.toLowerCase().includes('help') || content.toLowerCase().includes('support')) {
            aiResponse = `I'm here to help! I can assist with general questions about the platform, basic academic concepts, and guide you to the right resources. For complex or subject-specific questions, I recommend creating a help request to connect with a human tutor who can provide personalized assistance.`;
        } else {
            aiResponse = `Thank you for your message. I understand you're asking about: "${content}". As an AI assistant, I can help with general academic questions and platform navigation. For detailed subject-specific assistance, I recommend reaching out to a human tutor through the help request system for personalized support.`;
        }

        // Simulate AI processing delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        res.status(200).json({
            message: 'AI response generated',
            response: {
                content: aiResponse,
                timestamp: new Date(),
                isAI: true,
                confidence: 0.85
            }
        });

    } catch (error) {
        console.error('AI assistant error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to process AI request'
        });
    }
});

/**
 * PUT /api/messages/messages/:messageId/read
 * Mark a message as read
 */
router.put('/messages/:messageId/read', authenticate(), async (req, res) => {
    try {
        const { messageId } = req.params;
        const user = await User.findOne({ userId: req.user.userId });

        const message = await Message.findOne({ 
            messageId,
            receiverId: user._id
        });

        if (!message) {
            return res.status(404).json({
                error: 'Message not found',
                message: 'Message not found or access denied'
            });
        }

        message.isRead = true;
        await message.save();

        // Update conversation unread count
        const conversation = await Conversation.findById(message.conversationId);
        if (conversation && conversation.unreadCount > 0) {
            conversation.unreadCount -= 1;
            await conversation.save();
        }

        res.status(200).json({
            message: 'Message marked as read'
        });

    } catch (error) {
        console.error('Mark message read error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to mark message as read'
        });
    }
});

/**
 * GET /api/messages/unread-count
 * Get total unread message count
 */
router.get('/unread-count', authenticate(), async (req, res) => {
    try {
        const user = await User.findOne({ userId: req.user.userId });

        const unreadCount = await Message.countDocuments({
            receiverId: user._id,
            isRead: false
        });

        res.status(200).json({
            unreadCount: unreadCount
        });

    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Unable to fetch unread count'
        });
    }
});

module.exports = router;