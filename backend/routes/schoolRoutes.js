const express = require('express');
const router = express.Router();
const School = require('../models/School');
const auth = require('../middleware/authMiddleware');

router.get('/', auth, async (req, res) => {
    try {
        const query = {};
        if (req.query.department) query.department = req.query.department;
        if (req.query.name) query.name = { $regex: req.query.name, $options: 'i' }; // Case insensitive search

        const schools = await School.find(query);
        res.json(schools);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

router.get('/:id', auth, async (req, res) => {
    try {
        const school = await School.findById(req.params.id);
        if (!school) return res.status(404).json({ msg: 'School not found' });
        res.json(school);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') return res.status(404).json({ msg: 'School not found' });
        res.status(500).send('Server error');
    }
});

router.post('/', auth, async (req, res) => {
    try {
        const newSchool = new School(req.body);
        const school = await newSchool.save();
        res.json(school);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
