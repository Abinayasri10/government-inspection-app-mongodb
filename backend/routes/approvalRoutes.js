const express = require('express');
const router = express.Router();
const Approval = require('../models/Approval');
const auth = require('../middleware/authMiddleware');

// Public approval verification
router.get('/verify', async (req, res) => {
    try {
        const { token, assignmentId, schoolId } = req.query;

        if (!token || !assignmentId || !schoolId) {
            return res.status(400).send('<h1>Missing Parameters</h1>');
        }

        const approval = await Approval.findOne({
            assignmentId,
            schoolId,
            approvalToken: token
        });

        if (!approval) {
            return res.status(404).send('<h1>Invalid or Expired Approval Link</h1>');
        }

        // Check if already approved
        if (approval.status === 'approved') {
            return res.send('<h1>Already Approved!</h1><p>This inspection was already approved.</p>');
        }

        // Update to approved
        approval.status = 'approved';
        approval.approved = true;
        approval.approvedAt = new Date();
        approval.approvedBy = 'Email Link (Principal)'; // Or retrieve from record
        approval.approvalMethod = 'email_link';

        await approval.save();

        res.send(`
            <html>
                <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                    <h1 style="color: green;">Approval Successful!</h1>
                    <p>The inspection for <strong>${approval.schoolName}</strong> has been approved.</p>
                    <p>You can close this window.</p>
                </body>
            </html>
        `);
    } catch (err) {
        console.error(err);
        res.status(500).send('<h1>Server Error</h1>');
    }
});

// Create approval request
router.post('/', auth, async (req, res) => {
    try {
        // Check if one already exists for this assignment
        let approval = await Approval.findOne({
            assignmentId: req.body.assignmentId,
            schoolId: req.body.schoolId
        });

        if (approval) {
            return res.json(approval);
        }

        const newApproval = new Approval(req.body);
        approval = await newApproval.save();
        res.json(approval);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Update approval (e.g. after email sent, or approved)
router.put('/:id', auth, async (req, res) => {
    try {
        const approval = await Approval.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(approval);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Check status / Poll
router.get('/status', auth, async (req, res) => {
    try {
        const { assignmentId, schoolId } = req.query;
        if (!assignmentId || !schoolId) return res.status(400).json({ msg: 'Missing parameters' });

        const approval = await Approval.findOne({ assignmentId, schoolId });
        if (!approval) return res.status(404).json({ msg: 'Not found' });

        res.json(approval);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Simulate approval
router.post('/simulate', auth, async (req, res) => {
    try {
        const { assignmentId, schoolId } = req.body;
        const approval = await Approval.findOneAndUpdate(
            { assignmentId, schoolId },
            {
                approved: true,
                approvedAt: new Date(),
                approvedBy: "principal_simulation",
                status: "approved",
                approvalMethod: "manual_simulation"
            },
            { new: true }
        );

        if (!approval) return res.status(404).json({ msg: 'Not found' });
        res.json(approval);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
