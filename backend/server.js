require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes')); // For listing users (e.g. BEOs)
app.use('/api/schools', require('./routes/schoolRoutes'));
app.use('/api/assignments', require('./routes/assignmentRoutes'));
app.use('/api/questions', require('./routes/questionRoutes'));
app.use('/api/inspections', require('./routes/inspectionRoutes'));
app.use('/api/approvals', require('./routes/approvalRoutes'));
app.use('/api/email', require('./routes/emailRoutes'));
app.use('/api/forms', require('./routes/formRoutes'));

app.get('/', (req, res) => {
    res.send('API running');
});

// Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('MongoDB connection error:', err);
    });
