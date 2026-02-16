const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
    from: { type: String, required: true },
    to: { type: String, required: true },
    subject: { type: String, required: true },
    textContent: String,
    htmlContent: String,
    status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
    errorMessage: String,
    response: mongoose.Schema.Types.Mixed,
    sentAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('EmailLog', emailLogSchema);
