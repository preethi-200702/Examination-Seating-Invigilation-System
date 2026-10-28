const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const { protect, authorize } = require('../middleware/authMiddleware');

// @route   GET /api/users
// @desc    Get all users (Admin only)
// @access  Private (Admin)
router.get('/', protect, authorize('admin'), async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, users });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/users/:id
// @desc    Get single user details
// @access  Private (Admin)
router.get('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    let linkedRecord = null;
    if (user.role === 'student' && user.refId) {
      linkedRecord = await Student.findOne({ registerNumber: user.refId });
    } else if (user.role === 'faculty' && user.refId) {
      linkedRecord = await Faculty.findOne({ facultyId: user.refId });
    }

    res.json({ success: true, user, linkedRecord });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/users/:id/status
// @desc    Toggle user active/inactive (Admin)
// @access  Private (Admin)
router.put('/:id/status', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot deactivate admin accounts.' });
    }

    user.isActive = isActive !== undefined ? isActive : !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `User account ${user.isActive ? 'activated' : 'deactivated'} successfully.`,
      user,
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/users/:id/reset-password
// @desc    Admin resets a user's password
// @access  Private (Admin)
router.put('/:id/reset-password', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 4 characters long.',
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.password = newPassword; // Will be hashed by pre-save hook
    await user.save();

    res.json({
      success: true,
      message: `Password for user "${user.username}" has been reset successfully.`,
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete a user account (Admin, but not self)
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot delete admin accounts.' });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: `User account "${user.username}" deleted successfully.` });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/users/create-admin
// @desc    Create a new admin user account (Admin only)
// @access  Private (Admin)
router.post('/create-admin', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { username, password, name, email } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Username, password, and full name are required.',
      });
    }

    if (password.length < 4) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 4 characters long.',
      });
    }

    const userExists = await User.findOne({ username: username.toLowerCase().trim() });
    if (userExists) {
      return res.status(409).json({
        success: false,
        message: `Username "${username}" is already taken. Please choose another username.`,
      });
    }

    const newAdmin = await User.create({
      username: username.toLowerCase().trim(),
      password,
      role: 'admin',
      name: name.trim(),
      email: email ? email.trim().toLowerCase() : '',
      refId: 'ADMIN' + Math.floor(100 + Math.random() * 900),
    });

    res.status(201).json({
      success: true,
      message: `New Admin account "${newAdmin.username}" created successfully.`,
      user: {
        _id: newAdmin._id,
        username: newAdmin.username,
        name: newAdmin.name,
        role: newAdmin.role,
        email: newAdmin.email,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/users/register-student
// @desc    Register a new student user account (public facing, student self-registration)
// @access  Public
router.post('/register-student', async (req, res, next) => {
  try {
    const { username, password, confirmPassword, registerNumber, name, department, year, section, email } = req.body;

    // Validate required fields
    if (!username || !password || !confirmPassword || !registerNumber || !name || !department || !year || !section) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: name, register number, department, year, section, username, password, and confirm password.',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    if (password.length < 4) {
      return res.status(400).json({ success: false, message: 'Password must be at least 4 characters long.' });
    }

    // Check if username is taken
    const userExists = await User.findOne({ username: username.toLowerCase().trim() });
    if (userExists) {
      return res.status(409).json({
        success: false,
        message: `Username "${username}" is already taken. Please choose a different username.`,
      });
    }

    // Check if this register number already has a user account
    const existingUser = await User.findOne({ refId: registerNumber.toUpperCase().trim(), role: 'student' });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: `A login account already exists for register number ${registerNumber.toUpperCase()}. Please login with your existing account or contact the exam coordinator.`,
      });
    }

    // Check if student record exists; if so, link to it, else create it
    let student = await Student.findOne({ registerNumber: registerNumber.toUpperCase().trim() });

    if (!student) {
      // Create student record
      student = await Student.create({
        name: name.trim(),
        registerNumber: registerNumber.toUpperCase().trim(),
        department: department.trim().toUpperCase(),
        year: parseInt(year),
        section: section.trim().toUpperCase(),
        email: email ? email.trim().toLowerCase() : '',
      });
    }

    // Create user account linked to student
    const user = await User.create({
      username: username.toLowerCase().trim(),
      password,
      role: 'student',
      name: student.name,
      email: email ? email.trim().toLowerCase() : student.email || '',
      refId: student.registerNumber,
    });

    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'examination_seating_jwt_secret_key_2026_cse',
      { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      message: 'Student account created successfully. You can now login.',
      token,
      user: {
        _id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        refId: user.refId,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/users/register-faculty
// @desc    Register a new faculty user account (self-registration)
// @access  Public
router.post('/register-faculty', async (req, res, next) => {
  try {
    const { username, password, confirmPassword, facultyId, name, department, email } = req.body;

    if (!username || !password || !confirmPassword || !facultyId || !name || !department) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: name, faculty ID, department, username, password, and confirm password.',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    if (password.length < 4) {
      return res.status(400).json({ success: false, message: 'Password must be at least 4 characters long.' });
    }

    // Check username
    const userExists = await User.findOne({ username: username.toLowerCase().trim() });
    if (userExists) {
      return res.status(409).json({
        success: false,
        message: `Username "${username}" is already taken. Please choose a different username.`,
      });
    }

    // Check if this faculty ID already has a user account
    const existingUser = await User.findOne({ refId: facultyId.toUpperCase().trim(), role: 'faculty' });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: `A login account already exists for Faculty ID ${facultyId.toUpperCase()}. Please login with your existing account.`,
      });
    }

    // Check if faculty record exists; if not, create it
    let faculty = await Faculty.findOne({ facultyId: facultyId.toUpperCase().trim() });

    if (!faculty) {
      faculty = await Faculty.create({
        name: name.trim(),
        facultyId: facultyId.toUpperCase().trim(),
        department: department.trim().toUpperCase(),
        availability: true,
        email: email ? email.trim().toLowerCase() : '',
      });
    }

    const user = await User.create({
      username: username.toLowerCase().trim(),
      password,
      role: 'faculty',
      name: faculty.name,
      email: email ? email.trim().toLowerCase() : faculty.email || '',
      refId: faculty.facultyId,
    });

    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'examination_seating_jwt_secret_key_2026_cse',
      { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      message: 'Faculty account created successfully. You can now login.',
      token,
      user: {
        _id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        refId: user.refId,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
