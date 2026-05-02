const express = require('express');
const multer = require('multer');
const path = require('path');
const Footwear = require('../models/Footwear');
const auth = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Cloudinary Storage for Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'footwear_db',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
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
    // Cloudinary returns the full URL in f.path
    const images = req.files ? req.files.map(f => f.path) : [];

    // Build the document explicitly (avoid spreading unknown fields)
    const footwear = await Footwear.create({
      modelNumber: req.body.modelNumber,
      brand:       req.body.brand,
      category:    req.body.category,
      subCategory: req.body.subCategory,
      gender:      req.body.gender,
      color:       req.body.color ? JSON.parse(req.body.color) : [],
      price:       Number(req.body.price),
      size:        req.body.size ? JSON.parse(req.body.size) : [],
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

// PUT /api/footwear/:id - Update footwear entry
router.put('/:id', auth, (req, res, next) => {
  upload.array('images', 5)(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    next();
  });
}, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (!req.user.isAdmin) query.addedBy = req.user._id;

    let footwear = await Footwear.findOne(query);
    if (!footwear) return res.status(404).json({ message: 'Footwear not found or unauthorized' });

    // Handle images: keep existing or add new from Cloudinary
    let images = footwear.images;
    if (req.body.replaceImages === 'true' && req.files) {
      images = req.files.map(f => f.path);
    } else if (req.files && req.files.length > 0) {
      images = [...images, ...req.files.map(f => f.path)];
    }

    footwear.modelNumber = req.body.modelNumber || footwear.modelNumber;
    footwear.brand = req.body.brand || footwear.brand;
    footwear.category = req.body.category || footwear.category;
    footwear.subCategory = req.body.subCategory || footwear.subCategory;
    footwear.gender = req.body.gender || footwear.gender;
    footwear.color = req.body.color ? JSON.parse(req.body.color) : footwear.color;
    footwear.price = req.body.price ? Number(req.body.price) : footwear.price;
    footwear.size = req.body.size ? JSON.parse(req.body.size) : footwear.size;
    footwear.material = req.body.material || footwear.material;
    footwear.description = req.body.description || footwear.description;
    footwear.images = images;

    await footwear.save();
    res.json(footwear);
  } catch (error) {
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
