const express = require('express');
const router = express.Router();
const Assignment = require('../models/Assignment');
const auth = require('../middleware/authMiddleware');

// Get all assignments
// Get all assignments with filtering
router.get('/', auth, async (req, res) => {
    try {
        const query = {};
        if (req.query.assignedTo) query.assignedTo = req.query.assignedTo;
        if (req.query.department) query.department = req.query.department;
        if (req.query.schoolId) query.schoolId = req.query.schoolId;
        if (req.query.status) query.status = req.query.status;

        const assignments = await Assignment.find(query)
            .populate('schoolId')
            .populate('assignedTo')
            .sort({ createdAt: -1 });
        res.json(assignments);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Create assignment
router.post('/', auth, async (req, res) => {
    try {
        const newAssignment = new Assignment(req.body);
        const assignment = await newAssignment.save();
        res.json(assignment);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Update assignment
router.put('/:id', auth, async (req, res) => {
    try {
        const assignment = await Assignment.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(assignment);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Delete assignment
router.delete('/:id', auth, async (req, res) => {
    try {
        await Assignment.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Assignment removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
