const express = require('express');
const router = express.Router();
const Inspection = require('../models/Inspection');
const auth = require('../middleware/authMiddleware');

router.get('/', auth, async (req, res) => {
    try {
        const query = {};
        if (req.query.userId) query.userId = req.query.userId;
        if (req.query.department) query.department = req.query.department;
        if (req.query.schoolId) query.schoolId = req.query.schoolId;
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
        const newInspection = new Inspection(req.body);
        const inspection = await newInspection.save();
        res.json(inspection);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

router.put('/:id', auth, async (req, res) => {
    try {
        const inspection = await Inspection.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(inspection);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
