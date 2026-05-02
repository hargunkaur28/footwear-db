const mongoose = require('mongoose');

// Stores custom user-added values for any dropdown field
const customOptionSchema = new mongoose.Schema({
  field: {
    type: String,
    required: true,
    enum: ['color', 'size', 'material'],
  },
  value: {
    type: String,
    required: true,
    trim: true,
  },
}, { timestamps: true });

// Compound unique index so same value can't be added twice per field
customOptionSchema.index({ field: 1, value: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

module.exports = mongoose.model('CustomOption', customOptionSchema);
