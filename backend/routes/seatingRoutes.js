const express = require('express');
const router = express.Router();
const Exam = require('../models/Exam');
const Student = require('../models/Student');
const Venue = require('../models/Venue');
const Seating = require('../models/Seating');
const Invigilation = require('../models/Invigilation');
const { protect, authorize } = require('../middleware/authMiddleware');

// @route   POST /api/seating/generate/:examId
// @desc    Generate seating arrangement for an examination
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

    // 1. Find matching students for this exam
    const students = await Student.find({
      department: exam.department,
      year: exam.year,
      section: exam.section,
    }).sort({ registerNumber: 1 });

    if (students.length === 0) {
      return res.status(400).json({
        success: false,
        message: `No students found for this examination. Check the exam criteria (Department: ${exam.department}, Year: ${exam.year}, Section: ${exam.section}).`,
      });
    }

    // 2. Find available venues
    const venues = await Venue.find({ availability: true }).sort({ capacity: -1, roomNumber: 1 });

    if (venues.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No available venues found for this examination. Please add active venues or mark existing venues as available.',
      });
    }

    // 3. Check total available capacity
    const totalCapacity = venues.reduce((sum, v) => sum + v.capacity, 0);

    if (totalCapacity < students.length) {
      return res.status(400).json({
        success: false,
        message: `Insufficient venue capacity. Required: ${students.length} seats. Available: ${totalCapacity} seats across active venues.`,
      });
    }

    // 4. Safely remove previous seating for this exam to prevent duplicates
    await Seating.deleteMany({ examId: exam._id });

    // 5. Allocate students sequentially across venues
    const allocatedSeatings = [];
    let studentIndex = 0;
    const usedVenues = [];

    for (const venue of venues) {
      if (studentIndex >= students.length) break;

      let seatInVenue = 1;
      let venueUsedThisRun = false;

      while (seatInVenue <= venue.capacity && studentIndex < students.length) {
        const student = students[studentIndex];

        allocatedSeatings.push({
          examId: exam._id,
          studentId: student._id,
          registerNumber: student.registerNumber,
          studentName: student.name,
          venueId: venue._id,
          roomNumber: venue.roomNumber,
          seatNumber: `S${seatInVenue}`,
        });

        seatInVenue++;
        studentIndex++;
        venueUsedThisRun = true;
      }

      if (venueUsedThisRun) {
        usedVenues.push(venue);
      }
    }

    // 6. Save allocations to MongoDB
    await Seating.insertMany(allocatedSeatings);

    // 7. Update exam status
    exam.status = 'Seating Generated';
    await exam.save();

    res.json({
      success: true,
      message: `Seating generated successfully for ${allocatedSeatings.length} students across ${usedVenues.length} venue(s).`,
      count: allocatedSeatings.length,
      venueCount: usedVenues.length,
      venuesUsed: usedVenues.map((v) => ({ roomNumber: v.roomNumber, venueName: v.venueName, capacity: v.capacity })),
      seating: allocatedSeatings,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/seating/exam/:examId
// @desc    Get seating allocations for an exam
// @access  Private (Admin & Faculty)
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

    const seatings = await Seating.find({ examId })
      .populate('venueId studentId')
      .sort({ roomNumber: 1, seatNumber: 1 });

    // Group seating by venue for clear visual representation
    const venueGroups = {};
    seatings.forEach((seat) => {
      const room = seat.roomNumber;
      if (!venueGroups[room]) {
        venueGroups[room] = {
          venueId: seat.venueId,
          roomNumber: room,
          venueName: seat.venueId?.venueName || room,
          students: [],
        };
      }
      venueGroups[room].students.push(seat);
    });

    res.json({
      success: true,
      exam,
      totalStudents: seatings.length,
      totalVenues: Object.keys(venueGroups).length,
      seatings,
      venueGroups: Object.values(venueGroups),
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/seating/student/my-seat
// @desc    Get logged in student's allocated exam seatings
// @access  Private (Student)
router.get('/student/my-seat', protect, async (req, res, next) => {
  try {
    const registerNumber = req.user.refId || req.user.username.toUpperCase();

    const student = await Student.findOne({ registerNumber: registerNumber.toUpperCase() });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: `Student profile not found for register number ${registerNumber}.`,
      });
    }

    // Find all seating records for this student
    const seatings = await Seating.find({ studentId: student._id })
      .populate('examId venueId')
      .sort({ createdAt: -1 });

    // Fetch any invigilator assigned to these venues for the respective exams
    const detailedSeatings = await Promise.all(
      seatings.map(async (seat) => {
        let invigilatorName = 'To be assigned';
        if (seat.examId && seat.venueId) {
          const inv = await Invigilation.findOne({
            examId: seat.examId._id,
            venueId: seat.venueId._id,
          });
          if (inv) {
            invigilatorName = inv.facultyName;
          }
        }
        return {
          ...seat.toObject(),
          invigilatorName,
        };
      })
    );

    res.json({
      success: true,
      student,
      seatings: detailedSeatings,
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/seating/exam/:examId
// @desc    Clear seating for an exam
// @access  Private (Admin only)
router.delete('/exam/:examId', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { examId } = req.params;
    await Seating.deleteMany({ examId });
    await Exam.findByIdAndUpdate(examId, { status: 'Scheduled' });

    res.json({
      success: true,
      message: 'Seating records for this examination have been cleared successfully.',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
