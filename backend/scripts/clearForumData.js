/* eslint-disable no-console */
// backend/scripts/clearForumData.js
const mongoose = require('mongoose');

const ForumPost = require('../models/ForumPost');
const ForumComment = require('../models/ForumComment');

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://stefanus:Stefan123@campuslearnofficial.ugym79y.mongodb.net/';

const run = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    const [postResult, commentResult] = await Promise.all([
      ForumPost.deleteMany({}),
      ForumComment.deleteMany({}),
    ]);

    console.log(`Removed ${postResult.deletedCount ?? 0} forum posts.`);
    console.log(`Removed ${commentResult.deletedCount ?? 0} forum comments.`);

    await mongoose.disconnect();
    console.log('Cleanup completed.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to clear forum data:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

run();
