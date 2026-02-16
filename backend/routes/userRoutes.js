const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/authMiddleware');
const bcrypt = require('bcryptjs');

// Get all users
router.get('/', auth, async (req, res) => {
    try {
        const query = {};
        if (req.query.role) query.role = req.query.role;
        if (req.query.department) query.department = req.query.department;

        const users = await User.find(query).select('-password');
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Update user (profile photo, password, etc)
router.put('/:id', auth, async (req, res) => {
    try {
        const { password, profilePhoto, ...otherUpdates } = req.body;
        const updateData = { ...otherUpdates };

        if (profilePhoto) {
            updateData.profilePhoto = profilePhoto;
        }

        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }

        // Make sure user can only update their own profile or is admin
        // For simplicity, allowing update if token is valid and matches ID or is admin
        // But req.user.id is available from auth middleware.
        if (req.user.id !== req.params.id && req.user.role !== 'admin') {
            return res.status(401).json({ msg: 'Not authorized to update this profile' });
        }

        const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
