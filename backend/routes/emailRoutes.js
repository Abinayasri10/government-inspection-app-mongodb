const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const nodemailer = require('nodemailer');
const EmailLog = require('../models/EmailLog');
const dns = require('dns');

// Force DNS to use IPv4 first to prevent ENETUNREACH on IPv6 (Common with Gmail/Render)
try {
    dns.setDefaultResultOrder('ipv4first');
} catch (e) {
    console.warn('dns.setDefaultResultOrder not supported in this Node version');
}

// Email Transporter Configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '465'),
    secure: true, // use true for 465
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    // Ensure standard TLS connection
    tls: {
        rejectUnauthorized: false // Helps with self-signed certs or some proxy issues
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
