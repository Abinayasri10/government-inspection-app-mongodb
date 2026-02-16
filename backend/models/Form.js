const mongoose = require('mongoose');

const formSchema = new mongoose.Schema({
    title: { type: String, required: true },
    department: { type: String, required: true },
    schoolLevel: { type: String, required: true },
    description: { type: String },
    version: { type: Number, default: 1 },
    active: { type: Boolean, default: true },
    questionCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Form', formSchema);
