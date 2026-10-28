const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const User = require('../models/User');
const Seating = require('../models/Seating');
const { protect, authorize } = require('../middleware/authMiddleware');

// @route   GET /api/students
// @desc    Get all students with search & filter
// @access  Private (Admin & Faculty)
router.get('/', protect, authorize('admin', 'faculty'), async (req, res, next) => {
  try {
    const { search, department, year, section } = req.query;
    let query = {};

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: searchRegex }, { registerNumber: searchRegex }, { email: searchRegex }];
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

    const students = await Student.find(query).sort({ registerNumber: 1 });
    res.json({
      success: true,
      count: students.length,
      students,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/students/:id
// @desc    Get single student by ID
// @access  Private
router.get('/:id', protect, async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found.',
      });
    }
    res.json({ success: true, student });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/students
// @desc    Add a new student (and create login account)
// @access  Private (Admin only)
router.post('/', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { name, registerNumber, department, year, section, email, password } = req.body;

    if (!name || !registerNumber || !department || !year || !section) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: Name, Register Number, Department, Year, and Section.',
      });
    }

    const formattedRegNo = registerNumber.toUpperCase().trim();

    // Check if register number already exists
    const existingStudent = await Student.findOne({ registerNumber: formattedRegNo });
    if (existingStudent) {
      return res.status(409).json({
        success: false,
        message: `Student could not be added. Register number "${formattedRegNo}" already exists in the system.`,
      });
    }

    const student = await Student.create({
      name: name.trim(),
      registerNumber: formattedRegNo,
      department: department.toUpperCase().trim(),
      year: Number(year),
      section: section.toUpperCase().trim(),
      email: email ? email.toLowerCase().trim() : '',
    });

    // Create student login user account if not already created
    const defaultUsername = formattedRegNo.toLowerCase();
    const existingUser = await User.findOne({ username: defaultUsername });
    if (!existingUser) {
      await User.create({
        username: defaultUsername,
        password: password || 'student123',
        role: 'student',
        name: student.name,
        email: student.email,
        refId: student.registerNumber,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Student added successfully.',
      student,
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/students/:id
// @desc    Update student details
// @access  Private (Admin only)
router.put('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { name, registerNumber, department, year, section, email } = req.body;

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found.',
      });
    }

    const oldRegNo = student.registerNumber;
    const newRegNo = registerNumber ? registerNumber.toUpperCase().trim() : oldRegNo;

    if (newRegNo !== oldRegNo) {
      const duplicate = await Student.findOne({ registerNumber: newRegNo, _id: { $ne: student._id } });
      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: `Cannot update. Register number "${newRegNo}" is already assigned to another student.`,
        });
      }
    }

    student.name = name ? name.trim() : student.name;
    student.registerNumber = newRegNo;
    student.department = department ? department.toUpperCase().trim() : student.department;
    student.year = year ? Number(year) : student.year;
    student.section = section ? section.toUpperCase().trim() : student.section;
    if (email !== undefined) student.email = email.toLowerCase().trim();

    await student.save();

    // Sync User name and refId
    await User.updateOne(
      { refId: oldRegNo },
      { name: student.name, refId: student.registerNumber, email: student.email }
    );

    res.json({
      success: true,
      message: 'Student updated successfully.',
      student,
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/students/:id
// @desc    Delete a student safely
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found.',
      });
    }

    // Safety check: Check if student has seating records
    const seatingCount = await Seating.countDocuments({ studentId: student._id });
    if (seatingCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Student cannot be deleted because ${seatingCount} exam seating record(s) depend on this student. Please delete or regenerate the related examination seating first.`,
      });
    }

    await Student.findByIdAndDelete(student._id);
    await User.deleteOne({ refId: student.registerNumber, role: 'student' });

    res.json({
      success: true,
      message: 'Student deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
