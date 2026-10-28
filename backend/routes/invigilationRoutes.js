const express = require('express');
const router = express.Router();
const Exam = require('../models/Exam');
const Faculty = require('../models/Faculty');
const Venue = require('../models/Venue');
const Seating = require('../models/Seating');
const Invigilation = require('../models/Invigilation');
const { protect, authorize } = require('../middleware/authMiddleware');
const { isTimeOverlap } = require('../utils/conflictDetector');

// @route   POST /api/invigilation/generate/:examId
// @desc    Generate invigilation assignments for an examination
// @access  Private (Admin only)
router.post('/generate/:examId', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { examId } = req.params;

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Examination record not found.',
      });
    }

    // 1. Find venues used for this examination from seating records
    const seatingRecords = await Seating.find({ examId });
    if (seatingRecords.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot generate invigilation: Seating has not been generated for this examination yet. Please generate seating first.',
      });
    }

    // Get unique venue IDs used for this exam
    const usedVenueIds = [...new Set(seatingRecords.map((s) => s.venueId.toString()))];
    const venues = await Venue.find({ _id: { $in: usedVenueIds } });

    const requiredInvigilatorCount = venues.length;

    // 2. Find available faculty
    const allAvailableFaculty = await Faculty.find({ availability: true }).sort({ facultyId: 1 });

    if (allAvailableFaculty.length < requiredInvigilatorCount) {
      return res.status(400).json({
        success: false,
        message: `Invigilation could not be generated. ${requiredInvigilatorCount} venue(s) require ${requiredInvigilatorCount} invigilators, but only ${allAvailableFaculty.length} available faculty member(s) were found in the system.`,
      });
    }

    // 3. Find all existing invigilation duties to check for time clashes
    const existingDuties = await Invigilation.find({ examId: { $ne: exam._id } });

    // Filter faculty members who are NOT conflicting with another exam at the same date and time
    const eligibleFaculty = [];
    const conflictingFacultyDetails = [];

    for (const fac of allAvailableFaculty) {
      const facDuties = existingDuties.filter(
        (duty) => duty.facultyId.toString() === fac._id.toString()
      );

      let hasClash = false;
      let clashInfo = null;

      for (const duty of facDuties) {
        if (
          isTimeOverlap(
            exam.examDate,
            exam.startTime,
            exam.endTime,
            duty.examDate,
            duty.startTime,
            duty.endTime
          )
        ) {
          hasClash = true;
          clashInfo = duty;
          break;
        }
      }

      if (!hasClash) {
        eligibleFaculty.push(fac);
      } else {
        conflictingFacultyDetails.push({
          facultyId: fac.facultyId,
          facultyName: fac.name,
          clashingRoom: clashInfo.roomNumber,
          clashingTime: `${clashInfo.startTime} - ${clashInfo.endTime}`,
        });
      }
    }

    if (eligibleFaculty.length < requiredInvigilatorCount) {
      return res.status(400).json({
        success: false,
        message: `Invigilation could not be generated. ${requiredInvigilatorCount} invigilators are required, but only ${eligibleFaculty.length} faculty are free during ${exam.startTime} - ${exam.endTime}. (${conflictingFacultyDetails.length} faculty member(s) are already assigned to overlapping duties).`,
        conflictingFaculty: conflictingFacultyDetails,
      });
    }

    // 4. Safely remove previous invigilation for this exam
    await Invigilation.deleteMany({ examId: exam._id });

    // 5. Assign faculty to venues
    const assignments = [];
    for (let i = 0; i < venues.length; i++) {
      const venue = venues[i];
      const faculty = eligibleFaculty[i];

      assignments.push({
        examId: exam._id,
        venueId: venue._id,
        facultyId: faculty._id,
        facultyCode: faculty.facultyId,
        facultyName: faculty.name,
        roomNumber: venue.roomNumber,
        examDate: exam.examDate,
        startTime: exam.startTime,
        endTime: exam.endTime,
      });
    }

    // 6. Save to MongoDB
    await Invigilation.insertMany(assignments);

    // 7. Update exam status
    exam.status = 'Invigilation Assigned';
    await exam.save();

    res.json({
      success: true,
      message: `Invigilation generated successfully. ${assignments.length} faculty member(s) assigned to ${venues.length} examination venue(s).`,
      assignments,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/invigilation/exam/:examId
// @desc    Get invigilation assignments for an exam
// @access  Private
router.get('/exam/:examId', protect, async (req, res, next) => {
  try {
    const { examId } = req.params;

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Examination record not found.',
      });
    }

    const assignments = await Invigilation.find({ examId })
      .populate('venueId facultyId')
      .sort({ roomNumber: 1 });

    res.json({
      success: true,
      exam,
      count: assignments.length,
      assignments,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/invigilation/faculty/my-duties
// @desc    Get logged-in faculty's assigned invigilation duties
// @access  Private (Faculty)
router.get('/faculty/my-duties', protect, async (req, res, next) => {
  try {
    const facultyId = req.user.refId || req.user.username.toUpperCase();

    const faculty = await Faculty.findOne({ facultyId: facultyId.toUpperCase() });
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: `Faculty record not found for faculty ID ${facultyId}.`,
      });
    }

    const duties = await Invigilation.find({ facultyId: faculty._id })
      .populate('examId venueId')
      .sort({ examDate: 1, startTime: 1 });

    res.json({
      success: true,
      faculty,
      count: duties.length,
      duties,
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/invigilation/:id
// @desc    Manually re-assign invigilator to a venue duty
// @access  Private (Admin only)
router.put('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { facultyId } = req.body;

    const duty = await Invigilation.findById(req.params.id).populate('examId');
    if (!duty) {
      return res.status(404).json({
        success: false,
        message: 'Invigilation duty record not found.',
      });
    }

    const newFaculty = await Faculty.findById(facultyId);
    if (!newFaculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty member not found.',
      });
    }

    if (!newFaculty.availability) {
      return res.status(400).json({
        success: false,
        message: `Cannot assign faculty ${newFaculty.name} because they are marked as Unavailable.`,
      });
    }

    // Check if new faculty is already assigned during the same exam time
    const existingDuties = await Invigilation.find({
      facultyId: newFaculty._id,
      _id: { $ne: duty._id },
    });

    for (const otherDuty of existingDuties) {
      if (
        isTimeOverlap(
          duty.examDate,
          duty.startTime,
          duty.endTime,
          otherDuty.examDate,
          otherDuty.startTime,
          otherDuty.endTime
        )
      ) {
        return res.status(400).json({
          success: false,
          message: `Faculty ${newFaculty.name} (${newFaculty.facultyId}) is already assigned to another duty in Room ${otherDuty.roomNumber} during this time (${otherDuty.startTime} - ${otherDuty.endTime}).`,
        });
      }
    }

    duty.facultyId = newFaculty._id;
    duty.facultyCode = newFaculty.facultyId;
    duty.facultyName = newFaculty.name;

    await duty.save();

    res.json({
      success: true,
      message: `Invigilator successfully changed to ${newFaculty.name}.`,
      duty,
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/invigilation/exam/:examId
// @desc    Clear invigilation assignments for an exam
// @access  Private (Admin only)
router.delete('/exam/:examId', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { examId } = req.params;
    await Invigilation.deleteMany({ examId });

    // If seating still exists, set status to 'Seating Generated', else 'Scheduled'
    const seatingCount = await Seating.countDocuments({ examId });
    await Exam.findByIdAndUpdate(examId, {
      status: seatingCount > 0 ? 'Seating Generated' : 'Scheduled',
    });

    res.json({
      success: true,
      message: 'Invigilation duties for this examination have been cleared successfully.',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
