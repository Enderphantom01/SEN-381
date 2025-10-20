const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const ContentItem = require('../models/ContentItem');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allow all common file types
  const allowedTypes = [
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/markdown',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'video/mp4',
    'audio/mpeg',
    'audio/wav'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: fileFilter
});

// Get content items for a module
router.get('/module/:moduleId', async (req, res) => {
  try {
    const contentItems = await ContentItem.find({ 
      moduleId: req.params.moduleId, 
      isActive: true 
    }).sort({ order: 1 });
    res.json(contentItems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Upload new content item
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Determine file type
    const getFileType = (mimetype, originalname) => {
      const typeMap = {
        'application/vnd.ms-powerpoint': 'powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'powerpoint',
        'text/markdown': 'markdown',
        'application/pdf': 'pdf',
        'application/msword': 'word',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'word',
        'application/vnd.ms-excel': 'excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'excel',
        'image/': 'image',
        'video/': 'video',
        'audio/': 'audio',
        'text/plain': 'text'
      };

      for (const [key, value] of Object.entries(typeMap)) {
        if (mimetype.startsWith(key)) {
          return value;
        }
      }
      return 'other';
    };

    const contentItem = new ContentItem({
      moduleId: req.body.moduleId,
      courseId: req.body.courseId,
      title: req.body.title || req.file.originalname,
      description: req.body.description || '',
      fileType: getFileType(req.file.mimetype, req.file.originalname),
      fileUrl: `/uploads/${req.file.filename}`,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      uploadedBy: req.body.uploadedBy || 'anonymous' // Replace with actual user ID from auth
    });

    const savedItem = await contentItem.save();
    res.status(201).json(savedItem);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get single content item
router.get('/:id', async (req, res) => {
  try {
    const contentItem = await ContentItem.findById(req.params.id);
    if (!contentItem) {
      return res.status(404).json({ message: 'Content item not found' });
    }
    res.json(contentItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update content item
router.put('/:id', async (req, res) => {
  try {
    const contentItem = await ContentItem.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );
    res.json(contentItem);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete content item (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    await ContentItem.findByIdAndUpdate(
      req.params.id,
      { isActive: false, updatedAt: Date.now() }
    );
    res.json({ message: 'Content item deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;