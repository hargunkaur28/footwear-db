const express = require('express');
const multer = require('multer');
const path = require('path');
const Footwear = require('../models/Footwear');
const auth = require('../middleware/auth');
const router = express.Router();

// Multer config for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
  fileFilter,
});

// POST /api/footwear - Create new footwear entry
router.post('/', auth, (req, res, next) => {
  // Run multer manually so we can catch its errors as JSON
  upload.array('images', 5)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const images = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];

    // Build the document explicitly (avoid spreading unknown fields)
    const footwear = await Footwear.create({
      modelNumber: req.body.modelNumber,
      brand:       req.body.brand,
      category:    req.body.category,
      subCategory: req.body.subCategory,
      gender:      req.body.gender,
      color:       req.body.color,
      price:       Number(req.body.price),
      size:        req.body.size        || undefined,
      material:    req.body.material    || undefined,
      description: req.body.description || undefined,
      images,
      addedBy: req.user._id,
    });

    res.status(201).json(footwear);
  } catch (error) {
    // Return Mongoose validation errors as a readable message
    if (error.name === 'ValidationError') {
      const msg = Object.values(error.errors).map(e => e.message).join(', ');
      return res.status(400).json({ message: msg });
    }
    res.status(500).json({ message: error.message });
  }
});


// GET /api/footwear - Get all footwear entries
router.get('/', auth, async (req, res) => {
  try {
    // Admins see all, regular users see only their own
    const query = req.user.isAdmin ? {} : { addedBy: req.user._id };
    
    const footwear = await Footwear.find(query)
      .sort({ createdAt: -1 })
      .populate('addedBy', 'name email');
    res.json(footwear);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/footwear/:id - Get single entry
router.get('/:id', auth, async (req, res) => {
  try {
    const footwear = await Footwear.findById(req.params.id).populate('addedBy', 'name email');
    if (!footwear) {
      return res.status(404).json({ message: 'Footwear not found' });
    }
    res.json(footwear);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE /api/footwear/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    // Admins can delete any, regular users only their own
    const query = { _id: req.params.id };
    if (!req.user.isAdmin) {
      query.addedBy = req.user._id;
    }

    const footwear = await Footwear.findOneAndDelete(query);
    if (!footwear) {
      return res.status(404).json({ message: 'Footwear not found or unauthorized' });
    }
    res.json({ message: 'Footwear deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
