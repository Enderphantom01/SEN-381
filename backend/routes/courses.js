// routes/courses.js
const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Module = require('../models/Module');
const CourseContent = require('../models/CourseContent');

// Get all courses (for search and listing)
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find({ isActive: true })
      .sort({ createdAt: -1 })
      .select('code name image description lecturer status');
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single course with full structure (modules and content)
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Get all modules for this course
    const modules = await Module.find({ 
      courseId: req.params.id, 
      isActive: true 
    }).sort({ order: 1 });

    // Get content for each module
    const courseWithContent = {
      ...course.toObject(),
      modules: await Promise.all(
        modules.map(async (module) => {
          const contentItems = await CourseContent.find({
            moduleId: module._id,
            isActive: true
          })
          .populate('createdBy', 'name userId')
          .sort({ order: 1 });

          return {
            ...module.toObject(),
            contentItems: contentItems.map(item => ({
              id: item._id,
              title: item.title,
              content: item.content,
              contentType: item.contentType,
              files: item.files,
              order: item.order
            }))
          };
        })
      )
    };

    res.json(courseWithContent);
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

// Create new module for a course
router.post('/:id/modules', async (req, res) => {
  try {
    const module = new Module({
      ...req.body,
      courseId: req.params.id
    });
    const savedModule = await module.save();
    res.status(201).json(savedModule);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update module
router.put('/modules/:moduleId', async (req, res) => {
  try {
    const module = await Module.findByIdAndUpdate(
      req.params.moduleId,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );
    res.json(module);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Create new content item
router.post('/modules/:moduleId/content', async (req, res) => {
  try {
    const content = new CourseContent({
      ...req.body,
      moduleId: req.params.moduleId
    });
    const savedContent = await content.save();
    res.status(201).json(savedContent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update content item
router.put('/content/:contentId', async (req, res) => {
  try {
    const content = await CourseContent.findByIdAndUpdate(
      req.params.contentId,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );
    res.json(content);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Add file to content item
router.post('/content/:contentId/files', async (req, res) => {
  try {
    const content = await CourseContent.findById(req.params.contentId);
    if (!content) {
      return res.status(404).json({ message: 'Content item not found' });
    }

    content.files.push(req.body);
    const savedContent = await content.save();
    res.status(201).json(savedContent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;