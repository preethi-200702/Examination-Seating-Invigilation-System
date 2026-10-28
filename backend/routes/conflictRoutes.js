const express = require('express');
const router = express.Router();
const Conflict = require('../models/Conflict');
const { protect, authorize } = require('../middleware/authMiddleware');
const { runConflictScan } = require('../utils/conflictDetector');

// @route   GET /api/conflicts
// @desc    Get all detected conflicts with optional filtering
// @access  Private (Admin & Faculty)
router.get('/', protect, authorize('admin', 'faculty'), async (req, res, next) => {
  try {
    const { conflictType, status, severity } = req.query;

    // Run a live scan so conflicts are completely accurate
    await runConflictScan();

    let query = {};
    if (conflictType) query.conflictType = conflictType;
    if (status) query.status = status;
    if (severity) query.severity = severity;

    const conflicts = await Conflict.find(query)
      .populate('examId facultyId venueId studentId')
      .sort({ createdAt: -1 });

    const unresolvedCount = await Conflict.countDocuments({ status: 'Unresolved' });

    res.json({
      success: true,
      count: conflicts.length,
      unresolvedCount,
      conflicts,
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/conflicts/scan
// @desc    Trigger explicit conflict scan across the entire system
// @access  Private (Admin only)
router.post('/scan', protect, authorize('admin'), async (req, res, next) => {
  try {
    const conflicts = await runConflictScan();

    res.json({
      success: true,
      message:
        conflicts.length === 0
          ? 'No conflicts found in the system. Everything is scheduled smoothly!'
          : `Conflict check completed. ${conflicts.length} conflict(s) detected.`,
      count: conflicts.length,
      conflicts,
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/conflicts/:id/resolve
// @desc    Mark a conflict as Resolved or Acknowledged
// @access  Private (Admin only)
router.put('/:id/resolve', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { status } = req.body;
    const conflict = await Conflict.findById(req.params.id);

    if (!conflict) {
      return res.status(404).json({
        success: false,
        message: 'Conflict record not found.',
      });
    }

    conflict.status = status || 'Resolved';
    await conflict.save();

    res.json({
      success: true,
      message: `Conflict marked as ${conflict.status}.`,
      conflict,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
