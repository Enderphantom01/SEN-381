// models/Student.js - Student Model
const mongoose = require('mongoose');
const User = require('./user');

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

module.exports = User.discriminator('Student', StudentSchema);