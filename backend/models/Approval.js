const mongoose = require('mongoose');

const approvalSchema = new mongoose.Schema({
    assignmentId: { type: String, required: true },
    schoolId: { type: String, required: true },
    schoolName: String,
    principalName: String,
    principalEmail: String,
    inspectorName: String,
    inspectorId: String,
    inspectorRole: String,

    approved: { type: Boolean, default: false },
    approvalRequested: { type: Boolean, default: true },
    requestedAt: Date,
    approvalToken: String,
    status: { type: String, default: 'pending' },

    emailSent: { type: Boolean, default: false },
    emailSentAt: Date,
    emailResponse: mongoose.Schema.Types.Mixed,
    emailProvider: String,
    emailMethod: String,
    emailContent: mongoose.Schema.Types.Mixed,

    approvedAt: Date,
    approvedBy: String,
    approvalMethod: String,

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Approval', approvalSchema);
