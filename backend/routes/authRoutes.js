const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const { protect } = require('../middleware/authMiddleware');

// Generate JWT token helper
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'examination_seating_jwt_secret_key_2026_cse',
    { expiresIn: '30d' }
  );
};

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both username and password.',
      });
    }

    const user = await User.findOne({ username: username.toLowerCase().trim() });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password. Please check your credentials.',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password. Please check your credentials.',
      });
    }

    res.json({
      success: true,
      message: 'Login successful.',
      token: generateToken(user._id),
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

// @route   GET /api/auth/profile
// @desc    Get current logged in user profile
// @access  Private
router.get('/profile', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    let extraDetails = null;

    if (user.role === 'student' && user.refId) {
      extraDetails = await Student.findOne({ registerNumber: user.refId });
    } else if (user.role === 'faculty' && user.refId) {
      extraDetails = await Faculty.findOne({ facultyId: user.refId });
    }

    res.json({
      success: true,
      user,
      extraDetails,
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/auth/register
// @desc    Register a new user (admin, faculty, student)
// @access  Public
router.post('/register', async (req, res, next) => {
  try {
    const { username, password, role, name, email, refId } = req.body;

    if (!username || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Username, password, and full name are required.',
      });
    }

    const userExists = await User.findOne({ username: username.toLowerCase().trim() });
    if (userExists) {
      return res.status(409).json({
        success: false,
        message: `Username "${username}" is already taken. Please choose another username.`,
      });
    }

    const user = await User.create({
      username: username.toLowerCase().trim(),
      password,
      role: role || 'student',
      name: name.trim(),
      email: email ? email.trim() : '',
      refId: refId ? refId.trim() : '',
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token: generateToken(user._id),
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
