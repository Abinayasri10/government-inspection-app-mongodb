const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema({
    name: { type: String, required: true },
    address: { type: String, required: true },
    department: { type: String, default: 'education' },
    coordinates: {
        latitude: { type: Number },
        longitude: { type: Number }
    },
    schoolType: { type: String },
    level: { type: String },
    principalName: { type: String },
    principalPhone: { type: String },
    totalStudents: { type: Number },
    totalTeachers: { type: Number },
    establishedYear: { type: Number },
    lastInspectionDate: { type: Date },
    infrastructure: {
        totalClassrooms: { type: Number },
        hasLibrary: { type: Boolean, default: false },
        hasPlayground: { type: Boolean, default: false },
        hasToilets: { type: Boolean, default: false },
        separateToiletsForGirls: { type: Boolean, default: false },
        hasElectricity: { type: Boolean, default: false },
        hasWaterSupply: { type: Boolean, default: false },
        hasMidDayMealKitchen: { type: Boolean, default: false }
    },
    facilities: {
        computerLab: { type: Boolean, default: false },
        scienceLab: { type: Boolean, default: false },
        smartClassrooms: { type: Number, default: 0 },
        rampForDisabled: { type: Boolean, default: false }
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('School', schoolSchema);
