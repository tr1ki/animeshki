const mongoose = require('mongoose');

const mangaFileSchema = new mongoose.Schema({
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  filename: {
    type: String,
    required: true,
    trim: true
  },
  originalName: {
    type: String,
    required: true,
    trim: true
  },
  contentType: {
    type: String,
    required: true,
    trim: true
  },
  size: {
    type: Number,
    required: true,
    min: 0
  },
  kind: {
    type: String,
    enum: ['image', 'pdf', 'zip'],
    required: true
  },
  pageNumber: {
    type: Number,
    min: 1
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, {
  _id: false
});

const mangaSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  genre: [{
    type: String,
    required: true
  }],
  chapters: {
    type: Number,
    required: true,
    min: 1
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  releaseYear: {
    type: Number,
    required: true,
    min: 1900,
    max: new Date().getFullYear()
  },
  rating: {
    type: Number,
    min: 0,
    max: 10,
    default: 0
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  files: {
    type: [mangaFileSchema],
    default: []
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  moderatedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, {
  timestamps: true
});

mangaSchema.index({ owner: 1, createdAt: -1 });
mangaSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Manga', mangaSchema);
