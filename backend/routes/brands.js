const express = require('express');
const Brand = require('../models/Brand');
const auth = require('../middleware/auth');
const router = express.Router();

// GET /api/brands - Get all brands
router.get('/', auth, async (req, res) => {
  try {
    const brands = await Brand.find().sort({ name: 1 });
    res.json(brands);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/brands - Add a custom brand
router.post('/', auth, async (req, res) => {
  try {
    const { name } = req.body;

    // Check if brand already exists (case-insensitive)
    const existing = await Brand.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });
    if (existing) {
      return res.status(400).json({ message: 'Brand already exists' });
    }

    const brand = await Brand.create({
      name,
      isCustom: true,
      addedBy: req.user._id,
    });

    res.status(201).json(brand);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
