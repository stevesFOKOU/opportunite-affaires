const express = require('express');

const router = express.Router();

// Route to handle contact form submissions
router.post('/contact', (req, res) => {
  const { name, email, message } = req.body;
  try {
    // Here you would typically send an email or save the message to a database
    console.log(`Contact request from ${name} (${email}): ${message}`);
    res.status(200).json({ success: 'Message received' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
