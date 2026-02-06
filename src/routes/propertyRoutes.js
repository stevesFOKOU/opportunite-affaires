const express = require('express');
const { addProperty, getProperties } = require('../models/propertyModel');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

// Route to add a new property
router.post('/add', upload.array('photos', 5), (req, res) => {
  const { title, description, price } = req.body;
  const photos = req.files.map(file => file.path);
  try {
    const property = addProperty(title, description, price, photos);
    res.status(201).json(property);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Route to get all properties
router.get('/', (req, res) => {
  try {
    const properties = getProperties();
    res.status(200).json(properties);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
