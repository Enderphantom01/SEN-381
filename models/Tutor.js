const mongoose = require('mongoose');
const User = require('./User');

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

module.exports = User.discriminator('Tutor', TutorSchema);