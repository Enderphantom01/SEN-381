const mongoose = require('mongoose');
const User = require('./User');

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

// Static method to get admin by adminId
AdminSchema.statics.findByAdminId = function(adminId) {
  return this.findOne({ adminId });
};

// Method to log admin actions
AdminSchema.methods.logAction = function(action, target, details = null) {
  this.actionsLog.push({
    action,
    target,
    details
  });
  return this.save();
};

// Method to check if admin has specific permission
AdminSchema.methods.hasPermission = function(permission) {
  return this.permissions.includes(permission) || 
         this.accessLevel === 'super'; // Super admins have all permissions
};

// Method to add permission
AdminSchema.methods.addPermission = function(permission) {
  if (!this.permissions.includes(permission)) {
    this.permissions.push(permission);
  }
  return this.save();
};

// Method to remove permission
AdminSchema.methods.removePermission = function(permission) {
  this.permissions = this.permissions.filter(p => p !== permission);
  return this.save();
};

module.exports = User.discriminator('Admin', AdminSchema);