/* eslint-disable no-console */
// backend/scripts/seedForumData.js
const mongoose = require('mongoose');

const Student = require('../models/Student');
const Tutor = require('../models/Tutor');
const Admin = require('../models/Admin');
const Topic = require('../models/topic');
const ForumPost = require('../models/ForumPost');
const ForumComment = require('../models/ForumComment');

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://stefanus:Stefan123@campuslearnofficial.ugym79y.mongodb.net/';

const DEFAULT_PASSWORD = 'Password123!';

const USERS = [
  {
    type: 'Student',
    userId: 'S1101',
    name: 'Lauren Martinez',
    email: 'lauren.martinez@belgiumcampus.ac.za',
    phoneNumber: '0123456789',
    password: DEFAULT_PASSWORD,
    studentNumber: 'STU1101',
    academicDetails: {
      degree: 'BSc Computer Science',
      yearOfStudy: 3,
      subjects: ['Machine Learning', 'Data Science'],
    },
  },
  {
    type: 'Student',
    userId: 'S1102',
    name: 'Daniel Wright',
    email: 'daniel.wright@belgiumcampus.ac.za',
    phoneNumber: '0723456789',
    password: DEFAULT_PASSWORD,
    studentNumber: 'STU1102',
    academicDetails: {
      degree: 'BSc Software Engineering',
      yearOfStudy: 3,
      subjects: ['Algorithms', 'Data Structures'],
    },
  },
  {
    type: 'Tutor',
    userId: 'T1101',
    name: 'Amari Daniels',
    email: 'amari.daniels@belgiumcampus.ac.za',
    phoneNumber: '0823456789',
    password: DEFAULT_PASSWORD,
    tutorId: 'TUT1101',
    subjects: ['Machine Learning', 'Data Science'],
    rating: 4.8,
    isApproved: true,
    approvalDate: new Date('2025-01-05T09:00:00Z'),
  },
  {
    type: 'Admin',
    userId: 'A1101',
    name: 'CampusLearn Team',
    email: 'campuslearn.team@belgiumcampus.ac.za',
    phoneNumber: '0812345678',
    password: DEFAULT_PASSWORD,
    adminId: 'ADM1101',
    permissions: ['moderate_forum', 'manage_content'],
    accessLevel: 'standard',
  },
];

const TOPICS = [
  {
    topicId: 'TPC201',
    title: 'Machine Learning Fundamentals',
    description: 'Discuss weekly quizzes, assignments, and concepts from ML lectures.',
    subjectId: 'SUB201',
    creatorUserId: 'T1101',
    subscribers: ['S1101', 'S1102', 'T1101'],
  },
  {
    topicId: 'TPC202',
    title: 'Algorithms & Data Structures',
    description: 'Share revision tips and debug tricky algorithm problems together.',
    subjectId: 'SUB202',
    creatorUserId: 'S1102',
    subscribers: ['S1102', 'T1101'],
  },
];

const POSTS = [
  {
    postId: 'POST201',
    authorUserId: 'S1101',
    topicId: 'TPC201',
    title: 'Help with Week 3 Quiz',
    content:
      'Question 4 on the Week 3 quiz asks about the difference between min-max scaling and standardization. I am unsure when to use which technique and how it impacts gradient descent. Any advice?',
    isAnonymous: false,
    tags: ['machine learning', 'assignments'],
    likedByUsers: ['S1101', 'T1101', 'S1102'],
    dislikedByUsers: ['A1101'],
    createdAt: new Date('2025-09-29T08:30:00Z'),
  },
  {
    postId: 'POST202',
    authorUserId: 'S1102',
    topicId: 'TPC202',
    title: 'Recommended resources for divide-and-conquer practice?',
    content:
      'Looking for websites or videos that explain divide-and-conquer problems with clear walkthroughs. Preferably something that shows the recursion tree step-by-step.',
    isAnonymous: false,
    tags: ['algorithms', 'study'],
    likedByUsers: ['S1102', 'A1101'],
    dislikedByUsers: [],
    createdAt: new Date('2025-09-30T10:15:00Z'),
  },
  {
    postId: 'POST203',
    authorUserId: 'S1102',
    topicId: 'TPC201',
    title: 'Study group for upcoming ML practical',
    content:
      'Forming a small study group to prep for the practical. Planning to meet on Discord on Thursday at 19:00. Drop a comment if you want the invite link.',
    isAnonymous: true,
    tags: ['collaboration', 'machine learning'],
    likedByUsers: ['S1101'],
    dislikedByUsers: [],
    createdAt: new Date('2025-09-30T18:45:00Z'),
  },
];

const COMMENTS = [
  {
    commentId: 'CMT901',
    postId: 'POST201',
    authorUserId: 'T1101',
    content:
      'Use min-max scaling when your features have known minimum and maximum values. Standardization is better when data has outliers or the scale is unknown.',
    likes: 7,
    dislikes: 0,
    isInstructor: true,
    createdAt: new Date('2025-09-29T09:05:00Z'),
  },
  {
    commentId: 'CMT902',
    postId: 'POST201',
    authorUserId: 'S1101',
    content:
      'Thanks Amari! That makes sense. Do you have a quick reference on how to implement both in scikit-learn?',
    likes: 2,
    dislikes: 0,
    createdAt: new Date('2025-09-29T09:25:00Z'),
  },
  {
    commentId: 'CMT903',
    postId: 'POST202',
    authorUserId: 'A1101',
    content:
      'Check out the MIT OpenCourseWare videos on divide-and-conquer. They break down the recursion tree visually.',
    likes: 6,
    dislikes: 0,
    isInstructor: true,
    createdAt: new Date('2025-09-30T11:02:00Z'),
  },
  {
    commentId: 'CMT904',
    postId: 'POST203',
    authorUserId: 'S1101',
    content: 'Count me in! Please share the link when it is ready.',
    likes: 3,
    dislikes: 0,
    createdAt: new Date('2025-09-30T19:05:00Z'),
  },
];

const ensureStudent = async (data) => {
  let doc = await Student.findOne({ userId: data.userId });
  if (!doc) {
    doc = new Student({
      userId: data.userId,
      name: data.name,
      phoneNumber: data.phoneNumber,
      email: data.email.toLowerCase(),
      password: data.password,
      status: 'active',
      studentNumber: data.studentNumber,
      academicDetails: data.academicDetails,
    });
  } else {
    doc.name = data.name;
    doc.phoneNumber = data.phoneNumber;
    doc.email = data.email.toLowerCase();
    doc.status = 'active';
    doc.studentNumber = data.studentNumber;
    doc.academicDetails = data.academicDetails;
  }
  await doc.save();
  return doc;
};

const ensureTutor = async (data) => {
  let doc = await Tutor.findOne({ userId: data.userId });
  if (!doc) {
    doc = new Tutor({
      userId: data.userId,
      name: data.name,
      phoneNumber: data.phoneNumber,
      email: data.email.toLowerCase(),
      password: data.password,
      status: 'active',
      tutorId: data.tutorId,
      subjects: data.subjects,
      rating: data.rating ?? 0,
      isApproved: data.isApproved ?? false,
      approvalDate: data.approvalDate ?? null,
    });
  } else {
    doc.name = data.name;
    doc.phoneNumber = data.phoneNumber;
    doc.email = data.email.toLowerCase();
    doc.status = 'active';
    doc.tutorId = data.tutorId;
    doc.subjects = data.subjects;
    doc.rating = data.rating ?? doc.rating;
    doc.isApproved = data.isApproved ?? doc.isApproved;
    doc.approvalDate = data.approvalDate ?? doc.approvalDate;
  }
  await doc.save();
  return doc;
};

const ensureAdmin = async (data) => {
  let doc = await Admin.findOne({ userId: data.userId });
  if (!doc) {
    doc = new Admin({
      userId: data.userId,
      name: data.name,
      phoneNumber: data.phoneNumber,
      email: data.email.toLowerCase(),
      password: data.password,
      status: 'active',
      adminId: data.adminId,
      permissions: data.permissions ?? [],
      accessLevel: data.accessLevel ?? 'standard',
    });
  } else {
    doc.name = data.name;
    doc.phoneNumber = data.phoneNumber;
    doc.email = data.email.toLowerCase();
    doc.status = 'active';
    doc.adminId = data.adminId;
    doc.permissions = data.permissions ?? doc.permissions;
    doc.accessLevel = data.accessLevel ?? doc.accessLevel;
  }
  await doc.save();
  return doc;
};

const seedUsers = async () => {
  const map = {};
  for (const user of USERS) {
    try {
      let doc;
      if (user.type === 'Student') {
        doc = await ensureStudent(user);
      } else if (user.type === 'Tutor') {
        doc = await ensureTutor(user);
      } else if (user.type === 'Admin') {
        doc = await ensureAdmin(user);
      }
      if (doc) {
        map[user.userId] = doc;
      }
    } catch (error) {
      console.error(`Failed to seed user ${user.userId}:`, error.message);
    }
  }
  console.log(`Seeded ${Object.keys(map).length} users.`);
  return map;
};

const seedTopics = async (userMap) => {
  const map = {};
  for (const topic of TOPICS) {
    const creator = userMap[topic.creatorUserId];
    if (!creator) {
      console.warn(`Skipping topic ${topic.topicId}: creator ${topic.creatorUserId} missing.`);
      continue;
    }

    try {
      let doc = await Topic.findOne({ topicId: topic.topicId });
      if (!doc) {
        doc = new Topic({
          topicId: topic.topicId,
          title: topic.title,
          description: topic.description,
          subjectId: topic.subjectId,
          creatorId: creator._id,
          isActive: true,
        });
      } else {
        doc.title = topic.title;
        doc.description = topic.description;
        doc.subjectId = topic.subjectId;
        doc.creatorId = creator._id;
        doc.isActive = true;
      }
      const subscriberIds = new Set(
        (topic.subscribers || [])
          .map((id) => userMap[id]?._id)
          .filter((value) => Boolean(value)),
      );
      doc.subscribers = Array.from(subscriberIds);
      await doc.save();
      map[doc.topicId] = doc;
    } catch (error) {
      console.error(`Failed to seed topic ${topic.topicId}:`, error.message);
    }
  }
  console.log(`Seeded ${Object.keys(map).length} topics.`);
  return map;
};

const seedPosts = async (userMap, topicMap) => {
  const map = {};
  for (const post of POSTS) {
    const author = userMap[post.authorUserId];
    const topic = topicMap[post.topicId];
    if (!author || !topic) {
      console.warn(`Skipping post ${post.postId}: missing author or topic.`);
      continue;
    }

    try {
      let doc = await ForumPost.findOne({ postId: post.postId });
      if (!doc) {
        doc = new ForumPost({
          postId: post.postId,
          authorId: author._id,
          topicId: topic._id,
          title: post.title,
          content: post.content,
          isAnonymous: Boolean(post.isAnonymous),
          tags: post.tags || [],
          likes: 0,
          dislikes: 0,
        });
      } else {
        doc.authorId = author._id;
        doc.topicId = topic._id;
        doc.title = post.title;
        doc.content = post.content;
        doc.isAnonymous = Boolean(post.isAnonymous);
        doc.tags = post.tags || [];
      }

      const likedUserIds = (post.likedByUsers || [])
        .map((id) => userMap[id]?._id)
        .filter((value) => Boolean(value));
      const dislikedUserIds = (post.dislikedByUsers || [])
        .map((id) => userMap[id]?._id)
        .filter((value) => Boolean(value));

      doc.likedBy = likedUserIds;
      doc.dislikedBy = dislikedUserIds;
      doc.likes = likedUserIds.length;
      doc.dislikes = dislikedUserIds.length;

      await doc.save();
      if (post.createdAt) {
        await ForumPost.updateOne(
          { _id: doc._id },
          { $set: { createdAt: post.createdAt, updatedAt: post.createdAt } },
        );
        doc.createdAt = post.createdAt;
      }
      map[doc.postId] = await ForumPost.findById(doc._id);
    } catch (error) {
      console.error(`Failed to seed post ${post.postId}:`, error.message);
    }
  }
  console.log(`Seeded ${Object.keys(map).length} posts.`);
  return map;
};

const seedComments = async (userMap, postMap) => {
  let created = 0;
  for (const comment of COMMENTS) {
    const author = userMap[comment.authorUserId];
    const post = postMap[comment.postId];
    if (!author || !post) {
      console.warn(`Skipping comment ${comment.commentId}: missing author or post.`);
      continue;
    }

    try {
      let doc = await ForumComment.findOne({ commentId: comment.commentId });
      if (!doc) {
        doc = new ForumComment({
          commentId: comment.commentId,
          postId: post._id,
          authorId: author._id,
          content: comment.content,
          likes: comment.likes ?? 0,
          dislikes: comment.dislikes ?? 0,
          isInstructor: comment.isInstructor ?? ['Tutor', 'Admin'].includes(author.role),
          parentCommentId: null,
        });
      } else {
        doc.postId = post._id;
        doc.authorId = author._id;
        doc.content = comment.content;
        doc.likes = comment.likes ?? doc.likes;
        doc.dislikes = comment.dislikes ?? doc.dislikes;
        doc.isInstructor =
          comment.isInstructor ?? doc.isInstructor ?? ['Tutor', 'Admin'].includes(author.role);
        doc.parentCommentId = null;
      }
      await doc.save();
      if (comment.createdAt) {
        await ForumComment.updateOne(
          { _id: doc._id },
          { $set: { createdAt: comment.createdAt, updatedAt: comment.createdAt } },
        );
      }
      created += 1;
    } catch (error) {
      console.error(`Failed to seed comment ${comment.commentId}:`, error.message);
    }
  }
  console.log(`Seeded ${created} comments.`);
};

const run = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    const userMap = await seedUsers();
    const topicMap = await seedTopics(userMap);
    const postMap = await seedPosts(userMap, topicMap);
    await seedComments(userMap, postMap);

    console.log('Forum seed completed successfully.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Forum seed failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

run();
