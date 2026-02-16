const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const nodemailer = require('nodemailer');
const EmailLog = require('../models/EmailLog');

// Email Transporter Configuration
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    // Add these tls options to help with connection issues
    tls: {
        rejectUnauthorized: false, // Helps with self-signed certs or some proxy issues, use with caution in strict prod
        ciphers: 'SSLv3'
    }
});

// Send Email via Nodemailer (MongoDB Compatible logging)
router.post('/send', auth, async (req, res) => {
    try {
        const { to, toName, subject, htmlContent, textContent } = req.body;

        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.warn('Email credentials missing in .env');
            return res.status(500).json({ msg: 'Email configuration missing' });
        }

        const mailOptions = {
            from: process.env.EMAIL_FROM || '"Government Inspection System" <noreply@gov.in>',
            to: to,
            subject: subject,
            text: textContent || "No plain text content",
            html: htmlContent || "<p>No HTML content</p>"
        };

        try {
            const info = await transporter.sendMail(mailOptions);
            console.log('Email sent:', info.messageId);

            // Log to MongoDB
            const logEntry = new EmailLog({
                from: mailOptions.from,
                to: mailOptions.to.toString(),
                subject: mailOptions.subject,
                textContent: mailOptions.text,
                htmlContent: mailOptions.html,
                status: 'sent',
                response: info
            });
            await logEntry.save();

            res.json({ success: true, msg: 'Email sent successfully via Nodemailer', info: info });
        } catch (error) {
            console.error('Nodemailer Error:', error);

            // Log failure to MongoDB
            const logEntry = new EmailLog({
                from: mailOptions.from,
                to: mailOptions.to ? mailOptions.to.toString() : 'Unknown',
                subject: mailOptions.subject,
                textContent: mailOptions.text,
                htmlContent: mailOptions.html,
                status: 'failed',
                errorMessage: error.message,
                response: error
            });
            await logEntry.save();

            res.status(500).json({ msg: 'Failed to send email', error: error.message });
        }

    } catch (err) {
        console.error('Email Route Error:', err.message);
        res.status(500).send('Server error processing email request');
    }
});

module.exports = router;
