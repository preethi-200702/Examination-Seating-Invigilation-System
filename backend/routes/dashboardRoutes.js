const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const Venue = require('../models/Venue');
const Exam = require('../models/Exam');
const Seating = require('../models/Seating');
const Invigilation = require('../models/Invigilation');
const Conflict = require('../models/Conflict');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/dashboard/stats
// @desc    Get dashboard metrics and counts from database
// @access  Private
router.get('/stats', protect, async (req, res, next) => {
  try {
    const [
      totalStudents,
      totalFaculty,
      totalVenues,
      totalExams,
      totalSeatings,
      totalInvigilations,
      totalConflicts,
      activeVenues,
      activeFaculty,
      recentExams,
    ] = await Promise.all([
      Student.countDocuments(),
      Faculty.countDocuments(),
      Venue.countDocuments(),
      Exam.countDocuments(),
      Seating.countDocuments(),
      Invigilation.countDocuments(),
      Conflict.countDocuments({ status: 'Unresolved' }),
      Venue.countDocuments({ availability: true }),
      Faculty.countDocuments({ availability: true }),
      Exam.find().sort({ examDate: 1, startTime: 1 }).limit(5),
    ]);

    // Calculate total capacity
    const venues = await Venue.find({ availability: true });
    const totalCapacity = venues.reduce((sum, v) => sum + v.capacity, 0);

    res.json({
      success: true,
      stats: {
        totalStudents,
        totalFaculty,
        activeFaculty,
        totalVenues,
        activeVenues,
        totalExams,
        totalSeatings,
        totalInvigilations,
        totalConflicts,
        totalCapacity,
      },
      recentExams,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
