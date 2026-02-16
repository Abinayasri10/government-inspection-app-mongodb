const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
    department: { type: String, required: true },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    deadline: { type: Date, required: true },
    specialInstructions: String,
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: { type: String, enum: ['pending', 'completed', 'under review'], default: 'pending' },
    finalStatus: String,
    ceoReviewed: { type: Boolean, default: false },
    completedAt: Date,
    ceoReviewedAt: Date,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Assignment', assignmentSchema);
