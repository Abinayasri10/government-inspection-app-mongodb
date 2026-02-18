const mongoose = require('mongoose');

const inspectionSchema = new mongoose.Schema({
    // School Information (Snapshot at time of inspection)
    schoolName: String,
    address: String,
    schoolLevel: String,
    schoolType: String,
    principalName: String,
    principalPhone: String,
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School' },

    // User / Assignment Context
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: String,
    department: String,
    role: String,
    inspectorName: String,
    inspectorDesignation: String,
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment' },

    // Inspection Data
    inspectionDate: String,
    responses: { type: Map, of: mongoose.Schema.Types.Mixed }, // Stores key-value pairs of q_id -> answer
    photos: { type: Map, of: mongoose.Schema.Types.Mixed }, // Stores key -> photo object with URL & GPS

    // Location and Verification
    inspectionLocation: {
        latitude: Number,
        longitude: Number,
        accuracy: Number
    },
    schoolLocation: {
        latitude: Number,
        longitude: Number
    },
    locationVerified: { type: Boolean, default: false },
    principalApproved: { type: Boolean, default: false },

    // Qualitative Data
    strengths: String,
    improvements: String,
    recommendations: String,
    remarks: String,

    // Signatures
    signature: String, // Base64 or URL
    signatureTimestamp: Date,

    // AI Analysis Result
    aiAnalysis: {
        flag: { type: String, enum: ['Red', 'Yellow', 'Green'], default: 'Green' },
        issues: [String],
        summary: [String],
        verifiedAt: { type: Date }
    },

    // Status & Meta
    status: { type: String, default: 'submitted' }, // submitted, reviewed, approved, rejected
    forwardedTo: String, // e.g. 'deo', 'ceo'
    submittedAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }

}, { strict: false, timestamps: true }); // strict: false allows saving fields not explicitly defined if needed

module.exports = mongoose.model('Inspection', inspectionSchema);
