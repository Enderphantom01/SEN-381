const mongoose = require('mongoose');

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

// Index for better query performance
TopicSchema.index({ subjectId: 1, isActive: 1 });
TopicSchema.index({ creatorId: 1 });

module.exports = mongoose.model('Topic', TopicSchema);