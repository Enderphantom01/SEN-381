const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Module = require('../models/Module');
const ContentItem = require('../models/ContentItem');

// Get all courses
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single course with modules and content
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const modules = await Module.find({ 
      courseId: req.params.id, 
      isActive: true 
    }).sort({ order: 1 });

    // Get content items for each module
    const courseData = {
      ...course.toObject(),
      modules: await Promise.all(
        modules.map(async (module) => {
          const contentItems = await ContentItem.find({
            moduleId: module._id,
            isActive: true
          }).sort({ order: 1 });
          return {
            ...module.toObject(),
            contentItems
          };
        })
      )
    };

    res.json(courseData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new course
router.post('/', async (req, res) => {
  try {
    const course = new Course(req.body);
    const savedCourse = await course.save();
    res.status(201).json(savedCourse);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update course
router.put('/:id', async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );
    res.json(course);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;