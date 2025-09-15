const mongoose = require('mongoose');
const User = require('./User');

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
    subjects: [{
      type: String
    }]
  }
});

module.exports = User.discriminator('Student', StudentSchema);