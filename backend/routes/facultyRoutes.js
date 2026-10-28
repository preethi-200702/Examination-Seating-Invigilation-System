const express = require('express');
const router = express.Router();
const Faculty = require('../models/Faculty');
const User = require('../models/User');
const Invigilation = require('../models/Invigilation');
const { protect, authorize } = require('../middleware/authMiddleware');

// @route   GET /api/faculty
// @desc    Get all faculty with search & filter
// @access  Private (Admin & Faculty)
router.get('/', protect, authorize('admin', 'faculty'), async (req, res, next) => {
  try {
    const { search, department, availability } = req.query;
    let query = {};

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: searchRegex }, { facultyId: searchRegex }, { email: searchRegex }];
    }

    if (department) {
      query.department = department.toUpperCase().trim();
    }

    if (availability !== undefined && availability !== '') {
      query.availability = availability === 'true' || availability === true;
    }

    const faculty = await Faculty.find(query).sort({ facultyId: 1 });
    res.json({
      success: true,
      count: faculty.length,
      faculty,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/faculty/:id
// @desc    Get single faculty member
// @access  Private
router.get('/:id', protect, async (req, res, next) => {
  try {
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty record not found.',
      });
    }
    res.json({ success: true, faculty });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/faculty
// @desc    Add a new faculty member (and create login account)
// @access  Private (Admin only)
router.post('/', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { name, facultyId, department, availability, email, phone, password } = req.body;

    if (!name || !facultyId || !department) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: Name, Faculty ID, and Department.',
      });
    }

    const formattedId = facultyId.toUpperCase().trim();

    const existingFaculty = await Faculty.findOne({ facultyId: formattedId });
    if (existingFaculty) {
      return res.status(409).json({
        success: false,
        message: `Faculty could not be added. Faculty ID "${formattedId}" already exists in the system.`,
      });
    }

    const faculty = await Faculty.create({
      name: name.trim(),
      facultyId: formattedId,
      department: department.toUpperCase().trim(),
      availability: availability !== undefined ? availability : true,
      email: email ? email.toLowerCase().trim() : '',
      phone: phone ? phone.trim() : '',
    });

    // Create faculty user login account
    const defaultUsername = formattedId.toLowerCase();
    const existingUser = await User.findOne({ username: defaultUsername });
    if (!existingUser) {
      await User.create({
        username: defaultUsername,
        password: password || 'faculty123',
        role: 'faculty',
        name: faculty.name,
        email: faculty.email,
        refId: faculty.facultyId,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Faculty added successfully.',
      faculty,
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/faculty/:id
// @desc    Update faculty details
// @access  Private (Admin only)
router.put('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { name, facultyId, department, availability, email, phone } = req.body;

    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty record not found.',
      });
    }

    const oldId = faculty.facultyId;
    const newId = facultyId ? facultyId.toUpperCase().trim() : oldId;

    if (newId !== oldId) {
      const duplicate = await Faculty.findOne({ facultyId: newId, _id: { $ne: faculty._id } });
      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: `Cannot update. Faculty ID "${newId}" is already assigned to another faculty member.`,
        });
      }
    }

    faculty.name = name ? name.trim() : faculty.name;
    faculty.facultyId = newId;
    faculty.department = department ? department.toUpperCase().trim() : faculty.department;
    if (availability !== undefined) faculty.availability = Boolean(availability);
    if (email !== undefined) faculty.email = email.toLowerCase().trim();
    if (phone !== undefined) faculty.phone = phone.trim();

    await faculty.save();

    // Sync User name and refId
    await User.updateOne(
      { refId: oldId },
      { name: faculty.name, refId: faculty.facultyId, email: faculty.email }
    );

    res.json({
      success: true,
      message: 'Faculty updated successfully.',
      faculty,
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/faculty/:id
// @desc    Delete a faculty member safely
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty record not found.',
      });
    }

    // Safety check: Check if faculty has invigilation records
    const dutyCount = await Invigilation.countDocuments({ facultyId: faculty._id });
    if (dutyCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Faculty cannot be deleted because ${dutyCount} active invigilation duty assignment(s) depend on this faculty member. Please reassign or delete the related examination invigilations first.`,
      });
    }

    await Faculty.findByIdAndDelete(faculty._id);
    await User.deleteOne({ refId: faculty.facultyId, role: 'faculty' });

    res.json({
      success: true,
      message: 'Faculty deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
