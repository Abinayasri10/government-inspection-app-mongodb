const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    formId: { type: mongoose.Schema.Types.ObjectId, ref: 'Form' }, // Optional, if null it's a default question
    text: { type: String, required: true },
    type: { type: String, enum: ['yesno', 'text', 'number', 'multipleChoice', 'photo', 'date'], default: 'yesno' },
    required: { type: Boolean, default: false },
    section: { type: String, required: true },
    schoolLevel: { type: String }, // Optional if linked to a form
    department: { type: String }, // Optional if linked to a form
    isDefault: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    options: [{ type: String }], // For multiple choice
    placeholder: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('InspectionQuestion', questionSchema);
