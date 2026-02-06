const express = require('express');
const { getProperties } = require('../models/propertyModel');

const router = express.Router();

// Route to get property details by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  try {
    const property = getProperties().find(p => p.id === parseInt(id));
    if (property) {
      res.status(200).json(property);
    } else {
      res.status(404).json({ error: 'Property not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
