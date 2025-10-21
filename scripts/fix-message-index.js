// fix-message-index.js - One-time script to fix the duplicate key error
const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://localhost:27017/campuslearnofficial';

const fixMessageIndex = async () => {
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB');

        // Get the messages collection
        const db = mongoose.connection.db;
        const messagesCollection = db.collection('messages');

        // Drop the problematic messageId index
        try {
            await messagesCollection.dropIndex('messageId_1');
            console.log('✅ Dropped messageId_1 index');
        } catch (error) {
            if (error.codeName === 'IndexNotFound') {
                console.log('ℹ️  messageId_1 index already removed');
            } else {
                throw error;
            }
        }

        // Create the new indexes based on our current schema
        await messagesCollection.createIndex({ conversationId: 1, createdAt: 1 });
        await messagesCollection.createIndex({ senderId: 1 });
        await messagesCollection.createIndex({ receiverId: 1 });
        await messagesCollection.createIndex({ status: 1 });
        
        console.log('✅ Created new indexes');
        console.log('✅ Message index fix completed successfully');

        await mongoose.connection.close();
        console.log('✅ Database connection closed');
        
    } catch (error) {
        console.error('❌ Error fixing message index:', error);
        process.exit(1);
    }
};

fixMessageIndex();