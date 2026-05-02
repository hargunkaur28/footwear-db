const mongoose = require('mongoose');

const footwearSchema = new mongoose.Schema({
  modelNumber: {
    type: String,
    required: [true, 'Model number is required'],
    trim: true,
  },
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true,
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Shoes', 'Sandals', 'Boots', 'Slippers', 'Loafers'],
  },
  subCategory: {
    type: String,
    required: [true, 'Sub-category is required'],
    trim: true,
  },
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: ['Men', 'Women', 'Unisex', 'Girl', 'Boy'],
  },
  color: [{
    type: String,
    trim: true,
  }],
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: 0,
  },
  size: [{
    type: String,
    trim: true,
  }],
  material: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  images: [{
    type: String, // file paths
  }],
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Footwear', footwearSchema);
