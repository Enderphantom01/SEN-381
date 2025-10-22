// seedDatabase.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connection string
const connectionString = 'mongodb://localhost:27017/campuslearnofficial';

// Define all models (replicating the provided schemas)
const UserSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
        match: [/^[A-Z]\d{3,}$/, 'Invalid user ID format']
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    phoneNumber: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                return /^(\+\d{1,3}[- ]?)?\d{10}$/.test(v);
            },
            message: props => `${props.value} is not a valid phone number!`
        }
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        validate: {
            validator: function(v) {
                return v.endsWith('@belgiumcampus.ac.za');
            },
            message: props => `${props.value} is not a valid Belgium Campus email!`
        }
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    },
    lastLogin: {
        type: Date,
        default: null
    },
    dateCreated: {
        type: Date,
        default: Date.now
    }
}, {
    discriminatorKey: 'role',
    collection: 'users'
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

UserSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', UserSchema);

// Admin Schema
const AdminSchema = new mongoose.Schema({
    adminId: {
        type: String,
        required: true,
        unique: true,
        match: [/^ADM\d{3,}$/, 'Invalid admin ID format']
    },
    permissions: [{
        type: String,
        enum: [
            'manage_users',
            'manage_tutors', 
            'manage_content',
            'view_analytics',
            'moderate_forum',
            'system_config'
        ]
    }],
    actionsLog: [{
        action: {
            type: String,
            required: true
        },
        target: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        details: mongoose.Schema.Types.Mixed
    }],
    accessLevel: {
        type: String,
        enum: ['super', 'standard', 'support'],
        default: 'standard'
    }
});

const Admin = User.discriminator('Admin', AdminSchema);

// Student Schema
const StudentSchema = new mongoose.Schema({
    studentNumber: {
        type: String,
        required: true,
        unique: true
    },
    academicDetails: {
        degree: {
            type: String,
            required: true
        },
        yearOfStudy: {
            type: Number,
            min: 1,
            max: 5,
            required: true
        },
        subjects: [String]
    }
});

const Student = User.discriminator('Student', StudentSchema);

// Tutor Schema
const TutorSchema = new mongoose.Schema({
    tutorId: {
        type: String,
        required: true,
        unique: true
    },
    subjects: [{
        type: String,
        required: true
    }],
    rating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0
    },
    isApproved: {
        type: Boolean,
        default: false
    },
    approvalDate: {
        type: Date,
        default: null
    }
});

const Tutor = User.discriminator('Tutor', TutorSchema);

// Course Schema
const CourseSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    image: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    lecturer: {
        name: {
            type: String,
            required: true
        },
        avatarUrl: {
            type: String,
            default: ''
        }
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive'],
        default: 'Active'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const Course = mongoose.model('Course', CourseSchema);

// Module Schema
const ModuleSchema = new mongoose.Schema({
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    order: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const Module = mongoose.model('Module', ModuleSchema);

// ContentItem Schema
const ContentItemSchema = new mongoose.Schema({
    moduleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Module',
        required: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    fileType: {
        type: String,
        required: true,
        enum: ['powerpoint', 'markdown', 'pdf', 'word', 'excel', 'image', 'video', 'audio', 'text', 'other']
    },
    fileUrl: {
        type: String,
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number,
        required: true
    },
    order: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const ContentItem = mongoose.model('ContentItem', ContentItemSchema);

// Topic Schema
const TopicSchema = new mongoose.Schema({
    topicId: {
        type: String,
        required: true,
        unique: true,
        match: [/^TPC\d{2,}$/, 'Invalid topic ID format']
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        required: true,
        maxlength: 1000
    },
    creatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    subjectId: {
        type: String,
        required: true,
        match: [/^SUB\d{2,}$/, 'Invalid subject ID format']
    },
    subscribers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

const Topic = mongoose.model('Topic', TopicSchema);

// ForumPost Schema
const ForumPostSchema = new mongoose.Schema({
    postId: {
        type: String,
        required: true,
        unique: true,
        match: [/^POST\d{3,}$/, 'Invalid post ID format']
    },
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    topicId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Topic',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    content: {
        type: String,
        required: true,
        maxlength: 5000
    },
    isAnonymous: {
        type: Boolean,
        default: false
    },
    likes: {
        type: Number,
        default: 0
    },
    likedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    dislikes: {
        type: Number,
        default: 0
    },
    dislikedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    isReported: {
        type: Boolean,
        default: false
    },
    reportReason: {
        type: String,
        maxlength: 500
    },
    tags: [String]
}, {
    timestamps: true
});

const ForumPost = mongoose.model('ForumPost', ForumPostSchema);

// ForumComment Schema
const ForumCommentSchema = new mongoose.Schema({
    commentId: {
        type: String,
        required: true,
        unique: true,
        match: [/^CMT\d{3,}$/, 'Invalid comment ID format']
    },
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumPost',
        required: true
    },
    authorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true,
        maxlength: 1000
    },
    likes: {
        type: Number,
        default: 0
    },
    dislikes: {
        type: Number,
        default: 0
    },
    isInstructor: {
        type: Boolean,
        default: false
    },
    parentCommentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ForumComment',
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

const ForumComment = mongoose.model('ForumComment', ForumCommentSchema);

// HelpRequest Schema
const HelpRequestSchema = new mongoose.Schema({
    requestId: {
        type: String,
        required: true,
        unique: true,
        match: [/^REQ\d{3,}$/, 'Invalid request ID format']
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    topicId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Topic',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    content: {
        type: String,
        required: true,
        maxlength: 5000
    },
    status: {
        type: String,
        enum: ['open', 'assigned', 'in-progress', 'resolved', 'closed'],
        default: 'open'
    },
    assignedTutorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    resolution: {
        answer: String,
        resolvedAt: Date,
        resolvedById: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }
}, {
    timestamps: true
});

const HelpRequest = mongoose.model('HelpRequest', HelpRequestSchema);

// Conversation Schema
const ConversationSchema = new mongoose.Schema({
    conversationId: {
        type: String,
        required: true,
        unique: true,
        match: [/^CONV\d{3,}$/, 'Invalid conversation ID format']
    },
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    lastMessage: {
        type: String,
        maxlength: 500
    },
    lastMessageTime: {
        type: Date,
        default: Date.now
    },
    unreadCount: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

const Conversation = mongoose.model('Conversation', ConversationSchema);

// Message Schema
const MessageSchema = new mongoose.Schema({
    conversationId: {
        type: String,
        required: true
    },
    senderId: {
        type: String,
        required: true
    },
    receiverId: {
        type: String,
        required: true
    },
    text: {
        type: String,
        required: true,
        maxlength: 5000
    },
    status: {
        type: String,
        enum: ['sent', 'received', 'read'],
        default: 'sent'
    },
    messageType: {
        type: String,
        enum: ['text', 'file', 'system'],
        default: 'text'
    },
    file: {
        name: String,
        type: String,
        url: String,
        size: Number
    }
}, {
    timestamps: true
});

const Message = mongoose.model('Message', MessageSchema);

// Notification Schema
const NotificationSchema = new mongoose.Schema({
    notificationId: {
        type: String,
        required: true,
        unique: true,
        match: [/^NOT\d{3,}$/, 'Invalid notification ID format']
    },
    recipientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: [
            'new_message',
            'help_request_assigned',
            'forum_reply',
            'topic_update',
            'system_announcement',
            'tutor_approved',
            'admin_alert'
        ],
        required: true
    },
    title: {
        type: String,
        required: true,
        maxlength: 200
    },
    content: {
        type: String,
        required: true,
        maxlength: 1000
    },
    status: {
        type: String,
        enum: ['pending', 'sent', 'delivered', 'read'],
        default: 'pending'
    },
    isRead: {
        type: Boolean,
        default: false
    },
    relatedEntity: {
        entityType: {
            type: String,
            enum: ['conversation', 'help_request', 'forum_post', 'topic', 'user']
        },
        entityId: mongoose.Schema.Types.ObjectId
    },
    emailSent: {
        type: Boolean,
        default: false
    },
    smsSent: {
        type: Boolean,
        default: false
    },
    pushSent: {
        type: Boolean,
        default: false
    },
    metadata: mongoose.Schema.Types.Mixed
}, {
    timestamps: true
});

const Notification = mongoose.model('Notification', NotificationSchema);

// Profile Schema
const ProfileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    bio: {
        type: String,
        maxlength: 500
    },
    academicBackground: {
        qualifications: [{
            institution: String,
            qualification: String,
            year: Number
        }],
        areasOfExpertise: [String]
    },
    activityLog: [{
        action: String,
        timestamp: {
            type: Date,
            default: Date.now
        },
        details: mongoose.Schema.Types.Mixed
    }],
    subscribedTopics: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Topic'
    }]
}, {
    timestamps: true
});

const Profile = mongoose.model('Profile', ProfileSchema);

// CourseContent Schema
const CourseContentSchema = new mongoose.Schema({
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    moduleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Module',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        default: ''
    },
    contentType: {
        type: String,
        required: true,
        enum: ['text', 'upload'],
        default: 'text'
    },
    files: [{
        fileName: String,
        fileUrl: String,
        fileSize: Number,
        uploadedAt: {
            type: Date,
            default: Date.now
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    order: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const CourseContent = mongoose.model('CourseContent', CourseContentSchema);

// Dummy Data Generation
const generateDummyData = async () => {
    console.log('Starting to generate dummy data...');

    // Clear existing data
    await User.deleteMany({});
    await Course.deleteMany({});
    await Module.deleteMany({});
    await ContentItem.deleteMany({});
    await Topic.deleteMany({});
    await ForumPost.deleteMany({});
    await ForumComment.deleteMany({});
    await HelpRequest.deleteMany({});
    await Conversation.deleteMany({});
    await Message.deleteMany({});
    await Notification.deleteMany({});
    await Profile.deleteMany({});
    await CourseContent.deleteMany({});

    console.log('Cleared existing data');

    // Create Users (Admins, Students, Tutors)
    const admin1 = new Admin({
        userId: 'A001',
        name: 'John Admin',
        phoneNumber: '+27123456789',
        email: 'john.admin@belgiumcampus.ac.za',
        password: 'admin123',
        adminId: 'ADM001',
        permissions: ['manage_users', 'manage_tutors', 'manage_content', 'view_analytics', 'moderate_forum', 'system_config'],
        accessLevel: 'super'
    });

    const admin2 = new Admin({
        userId: 'A002',
        name: 'Sarah Manager',
        phoneNumber: '+27123456780',
        email: 'sarah.manager@belgiumcampus.ac.za',
        password: 'admin123',
        adminId: 'ADM002',
        permissions: ['manage_users', 'manage_content', 'moderate_forum'],
        accessLevel: 'standard'
    });

    const tutor1 = new Tutor({
        userId: 'T001',
        name: 'Dr. James Wilson',
        phoneNumber: '+27123456781',
        email: 'james.wilson@belgiumcampus.ac.za',
        password: 'tutor123',
        tutorId: 'TUT001',
        subjects: ['Mathematics', 'Physics', 'Computer Science'],
        rating: 4.8,
        isApproved: true,
        approvalDate: new Date()
    });

    const tutor2 = new Tutor({
        userId: 'T002',
        name: 'Prof. Maria Garcia',
        phoneNumber: '+27123456782',
        email: 'maria.garcia@belgiumcampus.ac.za',
        password: 'tutor123',
        tutorId: 'TUT002',
        subjects: ['Programming', 'Database Systems', 'Web Development'],
        rating: 4.6,
        isApproved: true,
        approvalDate: new Date()
    });

    const student1 = new Student({
        userId: 'S001',
        name: 'Alice Johnson',
        phoneNumber: '+27123456783',
        email: 'alice.johnson@belgiumcampus.ac.za',
        password: 'student123',
        studentNumber: 'STU001',
        academicDetails: {
            degree: 'BSc Computer Science',
            yearOfStudy: 2,
            subjects: ['Programming', 'Mathematics', 'Database Systems']
        }
    });

    const student2 = new Student({
        userId: 'S002',
        name: 'Bob Smith',
        phoneNumber: '+27123456784',
        email: 'bob.smith@belgiumcampus.ac.za',
        password: 'student123',
        studentNumber: 'STU002',
        academicDetails: {
            degree: 'BSc Information Technology',
            yearOfStudy: 1,
            subjects: ['Web Development', 'Mathematics', 'Computer Literacy']
        }
    });

    const student3 = new Student({
        userId: 'S003',
        name: 'Carol Davis',
        phoneNumber: '+27123456785',
        email: 'carol.davis@belgiumcampus.ac.za',
        password: 'student123',
        studentNumber: 'STU003',
        academicDetails: {
            degree: 'BSc Software Engineering',
            yearOfStudy: 3,
            subjects: ['Advanced Programming', 'Algorithms', 'Software Design']
        }
    });

    // Save users
    await admin1.save();
    await admin2.save();
    await tutor1.save();
    await tutor2.save();
    await student1.save();
    await student2.save();
    await student3.save();

    console.log('Created users');

    // Create Courses
    const course1 = new Course({
        code: 'CS101',
        name: 'Introduction to Programming',
        image: '/images/cs101.jpg',
        description: 'Fundamental programming concepts using Python',
        lecturer: {
            name: 'Dr. James Wilson',
            avatarUrl: '/avatars/jwilson.jpg'
        },
        status: 'Active',
        createdBy: admin1._id
    });

    const course2 = new Course({
        code: 'CS201',
        name: 'Database Systems',
        image: '/images/cs201.jpg',
        description: 'Introduction to database design and SQL',
        lecturer: {
            name: 'Prof. Maria Garcia',
            avatarUrl: '/avatars/mgarcia.jpg'
        },
        status: 'Active',
        createdBy: admin1._id
    });

    const course3 = new Course({
        code: 'CS301',
        name: 'Web Development',
        image: '/images/cs301.jpg',
        description: 'Full-stack web development with modern frameworks',
        lecturer: {
            name: 'Prof. Maria Garcia',
            avatarUrl: '/avatars/mgarcia.jpg'
        },
        status: 'Active',
        createdBy: admin2._id
    });

    await course1.save();
    await course2.save();
    await course3.save();

    console.log('Created courses');

    // Create Modules
    const module1 = new Module({
        courseId: course1._id,
        title: 'Python Basics',
        description: 'Introduction to Python programming language',
        order: 1
    });

    const module2 = new Module({
        courseId: course1._id,
        title: 'Control Structures',
        description: 'Loops, conditionals, and program flow',
        order: 2
    });

    const module3 = new Module({
        courseId: course2._id,
        title: 'Database Design',
        description: 'ER diagrams and normalization',
        order: 1
    });

    const module4 = new Module({
        courseId: course2._id,
        title: 'SQL Fundamentals',
        description: 'Structured Query Language basics',
        order: 2
    });

    await module1.save();
    await module2.save();
    await module3.save();
    await module4.save();

    console.log('Created modules');

    // Create Content Items
    const content1 = new ContentItem({
        moduleId: module1._id,
        courseId: course1._id,
        title: 'Python Introduction Slides',
        description: 'Introduction to Python programming',
        fileType: 'powerpoint',
        fileUrl: '/content/python-intro.pptx',
        fileName: 'python-intro.pptx',
        fileSize: 2048576,
        order: 1,
        uploadedBy: tutor1._id
    });

    const content2 = new ContentItem({
        moduleId: module1._id,
        courseId: course1._id,
        title: 'Python Basics PDF',
        description: 'Detailed Python basics guide',
        fileType: 'pdf',
        fileUrl: '/content/python-basics.pdf',
        fileName: 'python-basics.pdf',
        fileSize: 1048576,
        order: 2,
        uploadedBy: tutor1._id
    });

    const content3 = new ContentItem({
        moduleId: module3._id,
        courseId: course2._id,
        title: 'Database Design Notes',
        description: 'Comprehensive database design guide',
        fileType: 'pdf',
        fileUrl: '/content/db-design.pdf',
        fileName: 'db-design.pdf',
        fileSize: 1572864,
        order: 1,
        uploadedBy: tutor2._id
    });

    await content1.save();
    await content2.save();
    await content3.save();

    console.log('Created content items');

    // Create Topics
    const topic1 = new Topic({
        topicId: 'TPC01',
        title: 'Python Programming Help',
        description: 'Get help with Python programming concepts and assignments',
        creatorId: tutor1._id,
        subjectId: 'SUB01',
        subscribers: [student1._id, student2._id, tutor1._id]
    });

    const topic2 = new Topic({
        topicId: 'TPC02',
        title: 'Database Systems Discussion',
        description: 'Discuss database concepts, SQL, and design patterns',
        creatorId: tutor2._id,
        subjectId: 'SUB02',
        subscribers: [student1._id, student3._id, tutor2._id]
    });

    const topic3 = new Topic({
        topicId: 'TPC03',
        title: 'Web Development Tips',
        description: 'Share web development tips and best practices',
        creatorId: tutor2._id,
        subjectId: 'SUB03',
        subscribers: [student2._id, student3._id, tutor2._id]
    });

    await topic1.save();
    await topic2.save();
    await topic3.save();

    console.log('Created topics');

    // Create Forum Posts
    const post1 = new ForumPost({
        postId: 'POST001',
        authorId: student1._id,
        topicId: topic1._id,
        title: 'Need help with Python loops',
        content: "I'm having trouble understanding how to use while loops in Python. Can someone explain with examples?",
        likes: 3,
        tags: ['python', 'loops', 'help']
    });

    const post2 = new ForumPost({
        postId: 'POST002',
        authorId: student2._id,
        topicId: topic2._id,
        title: 'SQL JOIN question',
        content: "What's the difference between INNER JOIN and LEFT JOIN? When should I use each?",
        likes: 5,
        tags: ['sql', 'database', 'joins']
    });

    const post3 = new ForumPost({
        postId: 'POST003',
        authorId: tutor1._id,
        topicId: topic1._id,
        title: 'Python Best Practices',
        content: "Here are some Python best practices that every beginner should know...",
        likes: 8,
        tags: ['python', 'best-practices', 'tips']
    });

    await post1.save();
    await post2.save();
    await post3.save();

    console.log('Created forum posts');

    // Create Forum Comments
    const comment1 = new ForumComment({
        commentId: 'CMT001',
        postId: post1._id,
        authorId: tutor1._id,
        content: 'While loops are great when you dont know how many iterations you need. Here is an example...',
        likes: 2,
        isInstructor: true
    });

    const comment2 = new ForumComment({
        commentId: 'CMT002',
        postId: post1._id,
        authorId: student2._id,
        content: 'Thanks for asking this! I was also confused about while loops.',
        likes: 1
    });

    const comment3 = new ForumComment({
        commentId: 'CMT003',
        postId: post2._id,
        authorId: tutor2._id,
        content: 'INNER JOIN returns only matching records, while LEFT JOIN returns all records from the left table...',
        likes: 4,
        isInstructor: true
    });

    await comment1.save();
    await comment2.save();
    await comment3.save();

    console.log('Created forum comments');

    // Create Help Requests
    const helpRequest1 = new HelpRequest({
        requestId: 'REQ001',
        studentId: student1._id,
        topicId: topic1._id,
        title: 'Stuck on Python assignment',
        content: "I can't figure out how to implement the recursive function in assignment 3.",
        status: 'assigned',
        assignedTutorId: tutor1._id
    });

    const helpRequest2 = new HelpRequest({
        requestId: 'REQ002',
        studentId: student2._id,
        topicId: topic2._id,
        title: 'Database normalization help',
        content: "I'm struggling with understanding third normal form.",
        status: 'open'
    });

    await helpRequest1.save();
    await helpRequest2.save();

    console.log('Created help requests');

    // Create Conversations
    const conversation1 = new Conversation({
        conversationId: 'CONV001',
        participants: [student1._id, tutor1._id],
        lastMessage: 'Thanks for your help with the Python assignment!',
        lastMessageTime: new Date(),
        unreadCount: 0,
        createdBy: student1._id
    });

    const conversation2 = new Conversation({
        conversationId: 'CONV002',
        participants: [student2._id, student3._id],
        lastMessage: "Let's work on the group project together",
        lastMessageTime: new Date(),
        unreadCount: 1,
        createdBy: student2._id
    });

    await conversation1.save();
    await conversation2.save();

    console.log('Created conversations');

    // Create Messages
    const message1 = new Message({
        conversationId: 'CONV001',
        senderId: student1.userId,
        receiverId: tutor1.userId,
        text: 'Hi, I need help with my Python assignment',
        status: 'read'
    });

    const message2 = new Message({
        conversationId: 'CONV001',
        senderId: tutor1.userId,
        receiverId: student1.userId,
        text: 'Sure, what specific problem are you facing?',
        status: 'read'
    });

    const message3 = new Message({
        conversationId: 'CONV001',
        senderId: student1.userId,
        receiverId: tutor1.userId,
        text: 'Thanks for your help with the Python assignment!',
        status: 'read'
    });

    await message1.save();
    await message2.save();
    await message3.save();

    console.log('Created messages');

    // Create Notifications
    const notification1 = new Notification({
        notificationId: 'NOT001',
        recipientId: student1._id,
        type: 'help_request_assigned',
        title: 'Help Request Assigned',
        content: 'Your help request has been assigned to a tutor',
        status: 'delivered',
        isRead: true,
        relatedEntity: {
            entityType: 'help_request',
            entityId: helpRequest1._id
        }
    });

    const notification2 = new Notification({
        notificationId: 'NOT002',
        recipientId: tutor1._id,
        type: 'forum_reply',
        title: 'New Reply to Your Post',
        content: 'Someone replied to your forum post about Python best practices',
        status: 'sent',
        relatedEntity: {
            entityType: 'forum_post',
            entityId: post3._id
        }
    });

    await notification1.save();
    await notification2.save();

    console.log('Created notifications');

    // Create Profiles
    const profile1 = new Profile({
        userId: student1._id,
        bio: 'Passionate computer science student interested in AI and machine learning',
        academicBackground: {
            qualifications: [
                {
                    institution: 'Belgium Campus',
                    qualification: 'BSc Computer Science',
                    year: 2023
                }
            ],
            areasOfExpertise: ['Python', 'Java', 'Web Development']
        },
        subscribedTopics: [topic1._id, topic2._id]
    });

    const profile2 = new Profile({
        userId: tutor1._id,
        bio: 'Senior lecturer with 10 years of experience in computer science education',
        academicBackground: {
            qualifications: [
                {
                    institution: 'University of Pretoria',
                    qualification: 'PhD Computer Science',
                    year: 2015
                }
            ],
            areasOfExpertise: ['Algorithms', 'Data Structures', 'Machine Learning']
        },
        subscribedTopics: [topic1._id, topic2._id, topic3._id]
    });

    await profile1.save();
    await profile2.save();

    console.log('Created profiles');

    // Create Course Content
    const courseContent1 = new CourseContent({
        courseId: course1._id,
        moduleId: module1._id,
        title: 'Python Variables and Data Types',
        content: 'In this lesson, we will learn about variables and different data types in Python...',
        contentType: 'text',
        order: 1,
        createdBy: tutor1._id
    });

    const courseContent2 = new CourseContent({
        courseId: course1._id,
        moduleId: module1._id,
        title: 'Python Functions',
        contentType: 'upload',
        files: [{
            fileName: 'python-functions.pdf',
            fileUrl: '/content/python-functions.pdf',
            fileSize: 1024000,
            uploadedBy: tutor1._id
        }],
        order: 2,
        createdBy: tutor1._id
    });

    await courseContent1.save();
    await courseContent2.save();

    console.log('Created course content');

    console.log('Database seeding completed successfully!');
    console.log('Summary of created data:');
    console.log('- 2 Admins, 2 Tutors, 3 Students');
    console.log('- 3 Courses with 4 Modules');
    console.log('- 3 Content Items');
    console.log('- 3 Topics');
    console.log('- 3 Forum Posts with 3 Comments');
    console.log('- 2 Help Requests');
    console.log('- 2 Conversations with 3 Messages');
    console.log('- 2 Notifications');
    console.log('- 2 Profiles');
    console.log('- 2 Course Content items');
};

// Main function to run the seeding process
const seedDatabase = async () => {
    try {
        // Connect to MongoDB
        console.log('Connecting to MongoDB...');
        await mongoose.connect(connectionString, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('Connected to MongoDB successfully');

        // Generate dummy data
        await generateDummyData();

        // Close connection
        await mongoose.connection.close();
        console.log('Database connection closed');
        
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

// Run the seeding process
seedDatabase();