const express = require('express');
const router = express.Router();
const InspectionQuestion = require('../models/InspectionQuestion');
const auth = require('../middleware/authMiddleware');

router.get('/', auth, async (req, res) => {
    try {
        const query = {};
        if (req.query.department) query.department = req.query.department;
        if (req.query.schoolLevel) query.schoolLevel = req.query.schoolLevel;
        const questions = await InspectionQuestion.find(query);
        res.json(questions);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

router.post('/', auth, async (req, res) => {
    try {
        const newQuestion = new InspectionQuestion(req.body);
        const question = await newQuestion.save();
        res.json(question);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

router.delete('/:id', auth, async (req, res) => {
    try {
        await InspectionQuestion.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Question removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
