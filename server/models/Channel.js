const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    type: {
        type: String,
        enum: ['public', 'announcement', 'private'],
        default: 'public'
    },
    description: { type: String },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // For access control
    allowedRoles: [{ type: String, default: 'user' }], // Roles allowed to access (view/join). e.g., ['admin', 'user']
    postingRoles: [{ type: String, default: 'user' }], // Roles allowed to send messages. e.g., ['admin'] for announcements
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Channel', channelSchema);
