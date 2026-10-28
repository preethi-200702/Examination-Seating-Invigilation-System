const express = require('express');
const router = express.Router();
const Exam = require('../models/Exam');
const Seating = require('../models/Seating');
const Invigilation = require('../models/Invigilation');
const Conflict = require('../models/Conflict');
const { protect, authorize } = require('../middleware/authMiddleware');
const { parseTimeToMinutes } = require('../utils/conflictDetector');

// @route   GET /api/exams
// @desc    Get all exams with search & filter
// @access  Private
router.get('/', protect, async (req, res, next) => {
  try {
    const { search, department, year, section, date } = req.query;
    let query = {};

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [{ subject: searchRegex }, { subjectCode: searchRegex }];
    }

    if (department) {
      query.department = department.toUpperCase().trim();
    }

    if (year) {
      query.year = Number(year);
    }

    if (section) {
      query.section = section.toUpperCase().trim();
    }

    if (date) {
      const targetDate = new Date(date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      query.examDate = { $gte: targetDate, $lt: nextDay };
    }

    const exams = await Exam.find(query).sort({ examDate: 1, startTime: 1 });

    // Populate seating count and invigilation assigned status for each exam
    const examsWithCounts = await Promise.all(
      exams.map(async (exam) => {
        const seatingCount = await Seating.countDocuments({ examId: exam._id });
        const invigilationCount = await Invigilation.countDocuments({ examId: exam._id });
        return {
          ...exam.toObject(),
          seatingCount,
          invigilationCount,
        };
      })
    );

    res.json({
      success: true,
      count: examsWithCounts.length,
      exams: examsWithCounts,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/exams/:id
// @desc    Get single exam details with stats
// @access  Private
router.get('/:id', protect, async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Examination record not found.',
      });
    }

    const seatingCount = await Seating.countDocuments({ examId: exam._id });
    const invigilationCount = await Invigilation.countDocuments({ examId: exam._id });

    res.json({
      success: true,
      exam: {
        ...exam.toObject(),
        seatingCount,
        invigilationCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/exams
// @desc    Create a new examination schedule
// @access  Private (Admin only)
router.post('/', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { subject, subjectCode, examDate, startTime, endTime, department, year, section } = req.body;

    if (!subject || !examDate || !startTime || !endTime || !department || !year || !section) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: Subject, Exam Date, Start Time, End Time, Department, Year, and Section.',
      });
    }

    // Validate that End Time is strictly after Start Time
    const startMins = parseTimeToMinutes(startTime);
    const endMins = parseTimeToMinutes(endTime);

    if (endMins <= startMins) {
      return res.status(400).json({
        success: false,
        message: `Invalid exam timing: End time (${endTime}) must be strictly after start time (${startTime}).`,
      });
    }

    const exam = await Exam.create({
      subject: subject.trim(),
      subjectCode: subjectCode ? subjectCode.toUpperCase().trim() : '',
      examDate: new Date(examDate),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      department: department.toUpperCase().trim(),
      year: Number(year),
      section: section.toUpperCase().trim(),
      status: 'Scheduled',
    });

    res.status(201).json({
      success: true,
      message: 'Exam created successfully.',
      exam,
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/exams/:id
// @desc    Update examination details
// @access  Private (Admin only)
router.put('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { subject, subjectCode, examDate, startTime, endTime, department, year, section } = req.body;

    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Examination record not found.',
      });
    }

    const newStart = startTime ? startTime.trim() : exam.startTime;
    const newEnd = endTime ? endTime.trim() : exam.endTime;

    const startMins = parseTimeToMinutes(newStart);
    const endMins = parseTimeToMinutes(newEnd);

    if (endMins <= startMins) {
      return res.status(400).json({
        success: false,
        message: `Invalid exam timing: End time (${newEnd}) must be strictly after start time (${newStart}).`,
      });
    }

    exam.subject = subject ? subject.trim() : exam.subject;
    if (subjectCode !== undefined) exam.subjectCode = subjectCode.toUpperCase().trim();
    if (examDate) exam.examDate = new Date(examDate);
    exam.startTime = newStart;
    exam.endTime = newEnd;
    if (department) exam.department = department.toUpperCase().trim();
    if (year) exam.year = Number(year);
    if (section) exam.section = section.toUpperCase().trim();

    await exam.save();

    // Also update examDate, startTime, endTime in any existing invigilation records
    await Invigilation.updateMany(
      { examId: exam._id },
      {
        examDate: exam.examDate,
        startTime: exam.startTime,
        endTime: exam.endTime,
      }
    );

    res.json({
      success: true,
      message: 'Exam updated successfully.',
      exam,
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/exams/:id
// @desc    Delete examination and cleanly remove related seating, invigilation, conflicts
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Examination record not found.',
      });
    }

    // Safely remove associated records
    await Seating.deleteMany({ examId: exam._id });
    await Invigilation.deleteMany({ examId: exam._id });
    await Conflict.deleteMany({ examId: exam._id });
    await Exam.findByIdAndDelete(exam._id);

    res.json({
      success: true,
      message: `Exam "${exam.subject}" and its associated seating/invigilation records have been removed cleanly.`,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
