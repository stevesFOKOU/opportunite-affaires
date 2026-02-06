const express = require('express');
const { getProperties } = require('../models/propertyModel');

const router = express.Router();

// Route to search properties
router.get('/search', (req, res) => {
  const { region, city, price } = req.query;
  try {
    let properties = getProperties();
    if (region) {
      properties = properties.filter(p => p.region === region);
    }
    if (city) {
      properties = properties.filter(p => p.city === city);
    }
    if (price) {
      properties = properties.filter(p => p.price <= parseFloat(price));
    }
    res.status(200).json(properties);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
