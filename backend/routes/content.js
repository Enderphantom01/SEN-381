// routes/content.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const CourseContent = require('../models/CourseContent');

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

// Upload file and add to content item
router.post('/upload/:contentId', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const content = await CourseContent.findById(req.params.contentId);
    if (!content) {
      return res.status(404).json({ message: 'Content item not found' });
    }

    const fileData = {
      fileName: req.file.originalname,
      fileUrl: `/uploads/${req.file.filename}`,
      fileSize: req.file.size,
      uploadedBy: req.body.uploadedBy
    };

    content.files.push(fileData);
    const savedContent = await content.save();

    res.status(201).json({
      message: 'File uploaded successfully',
      file: fileData,
      content: savedContent
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Remove file from content item
router.delete('/files/:contentId/:fileIndex', async (req, res) => {
  try {
    const content = await CourseContent.findById(req.params.contentId);
    if (!content) {
      return res.status(404).json({ message: 'Content item not found' });
    }

    const fileIndex = parseInt(req.params.fileIndex);
    if (fileIndex < 0 || fileIndex >= content.files.length) {
      return res.status(404).json({ message: 'File not found' });
    }

    content.files.splice(fileIndex, 1);
    const savedContent = await content.save();

    res.json({
      message: 'File removed successfully',
      content: savedContent
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;