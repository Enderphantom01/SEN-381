const express = require('express');
const router = express.Router();
const Module = require('../models/Module');
const ContentItem = require('../models/ContentItem');

// Get modules for a course
router.get('/course/:courseId', async (req, res) => {
  try {
    const modules = await Module.find({ 
      courseId: req.params.courseId, 
      isActive: true 
    }).sort({ order: 1 });
    res.json(modules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create module
router.post('/', async (req, res) => {
  try {
    const module = new Module(req.body);
    const savedModule = await module.save();
    res.status(201).json(savedModule);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update module
router.put('/:id', async (req, res) => {
  try {
    const module = await Module.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(module);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;