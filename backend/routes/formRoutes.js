const express = require('express');
const router = express.Router();
const Form = require('../models/Form');
const InspectionQuestion = require('../models/InspectionQuestion');
const auth = require('../middleware/authMiddleware');

// Get all forms
router.get('/', auth, async (req, res) => {
    try {
        const query = {};
        if (req.query.department) query.department = req.query.department;
        if (req.query.schoolLevel) query.schoolLevel = req.query.schoolLevel;
        if (req.query.active) query.active = req.query.active === 'true';

        const forms = await Form.find(query).sort({ createdAt: -1 });
        res.json(forms);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Create a new form
router.post('/', auth, async (req, res) => {
    try {
        const newForm = new Form({
            title: req.body.title,
            department: req.body.department,
            schoolLevel: req.body.schoolLevel,
            description: req.body.description,
            active: req.body.active !== undefined ? req.body.active : true,
            version: req.body.version || 1
        });

        const form = await newForm.save();
        res.json(form);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get a single form
router.get('/:id', auth, async (req, res) => {
    try {
        const form = await Form.findById(req.params.id);
        if (!form) return res.status(404).json({ msg: 'Form not found' });
        res.json(form);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') return res.status(404).json({ msg: 'Form not found' });
        res.status(500).send('Server error');
    }
});

// Update a form
router.put('/:id', auth, async (req, res) => {
    try {
        const form = await Form.findByIdAndUpdate(req.params.id, { $set: req.body, updatedAt: Date.now() }, { new: true });
        res.json(form);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Delete a form and its questions
router.delete('/:id', auth, async (req, res) => {
    try {
        const formId = req.params.id;

        // Delete all associated questions first
        await InspectionQuestion.deleteMany({ formId: formId });

        // Delete the form
        await Form.findByIdAndDelete(formId);

        res.json({ msg: 'Form and all its questions deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Get questions for a specific form
router.get('/:id/questions', auth, async (req, res) => {
    try {
        const questions = await InspectionQuestion.find({ formId: req.params.id }).sort({ order: 1 });
        res.json(questions);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Add a question to a form
router.post('/:id/questions', auth, async (req, res) => {
    try {
        const form = await Form.findById(req.params.id);
        if (!form) return res.status(404).json({ msg: 'Form not found' });

        const newQuestion = new InspectionQuestion({
            formId: req.params.id,
            text: req.body.text,
            type: req.body.type,
            required: req.body.required,
            section: req.body.section,
            options: req.body.options,
            placeholder: req.body.placeholder,
            order: req.body.order || 0
            // schoolLevel and department are inferred from the form context if needed, but not strictly required by model now
        });

        const question = await newQuestion.save();

        // Update question count
        const count = await InspectionQuestion.countDocuments({ formId: req.params.id });
        form.questionCount = count;
        await form.save();

        res.json(question);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Update a question in a form
router.put('/questions/:questionId', auth, async (req, res) => {
    try {
        const question = await InspectionQuestion.findByIdAndUpdate(
            req.params.questionId,
            { $set: req.body, updatedAt: Date.now() },
            { new: true }
        );
        res.json(question);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Delete a question from a form
router.delete('/questions/:questionId', auth, async (req, res) => {
    try {
        const question = await InspectionQuestion.findById(req.params.questionId);
        if (!question) return res.status(404).json({ msg: 'Question not found' });

        const formId = question.formId;
        await InspectionQuestion.findByIdAndDelete(req.params.questionId);

        // Update form question count
        if (formId) {
            const form = await Form.findById(formId);
            if (form) {
                const count = await InspectionQuestion.countDocuments({ formId: formId });
                form.questionCount = count;
                await form.save();
            }
        }

        res.json({ msg: 'Question removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
