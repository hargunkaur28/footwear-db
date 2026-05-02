const express = require('express');
const CustomOption = require('../models/CustomOption');
const auth = require('../middleware/auth');
const router = express.Router();

// GET /api/options/:field — get all custom values for a field
router.get('/:field', auth, async (req, res) => {
  const { field } = req.params;
  const allowed = ['color', 'size', 'material', 'subCategory', 'category'];
  if (!allowed.includes(field)) {
    return res.status(400).json({ message: 'Invalid field' });
  }
  try {
    const options = await CustomOption.find({ field }).sort({ value: 1 });
    res.json(options.map(o => o.value));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/options/:field — add a custom value
router.post('/:field', auth, async (req, res) => {
  const { field } = req.params;
  const allowed = ['color', 'size', 'material', 'subCategory', 'category'];
  if (!allowed.includes(field)) {
    return res.status(400).json({ message: 'Invalid field' });
  }
  try {
    const { value } = req.body;
    if (!value || !value.trim()) {
      return res.status(400).json({ message: 'Value is required' });
    }

    const option = await CustomOption.create({ field, value: value.trim() });
    res.status(201).json({ value: option.value });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'This option already exists' });
    }
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
