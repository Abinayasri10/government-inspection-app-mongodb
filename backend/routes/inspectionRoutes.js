const express = require('express');
const router = express.Router();
const Inspection = require('../models/Inspection');
const auth = require('../middleware/authMiddleware');
const { analyzeInspection } = require('../utils/aiAnalysis');

router.get('/', auth, async (req, res) => {
    try {
        const mongoose = require('mongoose');
        const query = {};
        if (req.query.userId) {
            if (typeof req.query.userId === 'string' && mongoose.Types.ObjectId.isValid(req.query.userId)) {
                query.userId = req.query.userId;
            } else {
                return res.json([]); // Invalid userId, return empty
            }
        }
        if (req.query.department) query.department = req.query.department;
        if (req.query.schoolId) {
            if (mongoose.Types.ObjectId.isValid(req.query.schoolId)) {
                query.schoolId = req.query.schoolId;
            }
        }
        if (req.query.forwardedTo) query.forwardedTo = req.query.forwardedTo;
        if (req.query.deoStatus) query.deoStatus = req.query.deoStatus;
        if (req.query.ceoStatus) query.ceoStatus = req.query.ceoStatus;

        const inspections = await Inspection.find(query).sort({ submittedAt: -1 });
        res.json(inspections);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

router.post('/', auth, async (req, res) => {
    try {
        const reportData = req.body;

        // AI Analysis
        try {
            const analysisResult = analyzeInspection(reportData);
            reportData.aiAnalysis = analysisResult;

            // Auto location verify if green
            if (analysisResult.flag === 'Green') {
                reportData.locationVerified = true;
            }
        } catch (error) {
            console.error("AI Analysis Failed:", error);
            // Non-blocking, default to green if failed? or better, mark as 'Pending' or similar. 
            // For now, let's just log and continue without crashing submission.
        }

        const newInspection = new Inspection(reportData);
        const inspection = await newInspection.save();
        res.json(inspection);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

router.put('/:id', auth, async (req, res) => {
    try {
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).send('Invalid ID');
        }
        const inspection = await Inspection.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(inspection);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
