const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    roomId: { type: String, required: true },
    user: { type: String, required: true }, // Username
    text: { type: String },
    fileUrl: { type: String },
    fileName: { type: String },
    type: { type: String, enum: ['text', 'file', 'system'], default: 'text' },
    status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
    readBy: [{ type: String }], // Array of usernames who have read the message
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);
