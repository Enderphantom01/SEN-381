// models/Admin.js - Admin Model
const mongoose = require('mongoose');
const User = require('./user');

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
    return this.permissions.includes(permission) || this.accessLevel === 'super';
};

module.exports = User.discriminator('Admin', AdminSchema);