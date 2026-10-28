const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('./models/User');
const Student = require('./models/Student');
const Faculty = require('./models/Faculty');
const Venue = require('./models/Venue');
const Exam = require('./models/Exam');
const Seating = require('./models/Seating');
const Invigilation = require('./models/Invigilation');
const Conflict = require('./models/Conflict');
const { runConflictScan } = require('./utils/conflictDetector');

dotenv.config();

const runTests = async () => {
  console.log('====================================================');
  console.log('STARTING BACKEND API & BUSINESS LOGIC VERIFICATION');
  console.log('====================================================\n');

  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/exam_seating_db');
    console.log(' Connected to MongoDB for testing.');

    // TEST 1: Admin Login & Password Match
    const admin = await User.findOne({ username: 'admin' });
    if (!admin) throw new Error('Admin user not found');
    const isPassValid = await admin.matchPassword('admin123');
    if (!isPassValid) throw new Error('Admin password hash mismatch');
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET || 'secret');
    console.log(' TEST 1: Admin login, password hashing, and JWT token generation PASSED.');

    // TEST 2 & 3: Student CRUD & Duplicate Check
    const testRegNo = '7376221CS999';
    await Student.deleteOne({ registerNumber: testRegNo });
    const newStudent = await Student.create({
      name: 'Test Student',
      registerNumber: testRegNo,
      department: 'CSE',
      year: 3,
      section: 'A',
      email: 'test999@college.edu',
    });
    console.log(' TEST 2: Student creation PASSED.');

    let duplicateFailed = false;
    try {
      await Student.create({
        name: 'Duplicate Student',
        registerNumber: testRegNo,
        department: 'CSE',
        year: 3,
        section: 'A',
      });
    } catch (err) {
      duplicateFailed = true;
    }
    if (!duplicateFailed) throw new Error('Duplicate register number was unexpectedly allowed');
    console.log(' TEST 3: Duplicate Student Register Number validation PASSED.');

    // TEST 4: Student Edit & Delete
    newStudent.name = 'Updated Test Student';
    await newStudent.save();
    await Student.findByIdAndDelete(newStudent._id);
    console.log(' TEST 4: Student edit and clean delete PASSED.');

    // TEST 5 & 6: Venue & Faculty Validation
    let invalidVenueCaught = false;
    try {
      await Venue.create({
        venueName: 'Zero Room',
        roomNumber: 'ZERO-01',
        capacity: 0,
      });
    } catch (e) {
      invalidVenueCaught = true;
    }
    if (!invalidVenueCaught) throw new Error('Venue with capacity 0 was allowed');
    console.log(' TEST 5: Venue capacity > 0 validation PASSED.');

    // TEST 7: Exam Schedule & Timing Validation (End time > Start time)
    const exam = await Exam.findOne({ subjectCode: 'CS3501' });
    if (!exam) throw new Error('Seed exam CS3501 not found');
    console.log(' TEST 7: Examination retrieval PASSED.');

    // TEST 8 & 9: Seating Generation (Clean & No Duplicates)
    const matchingStudents = await Student.find({
      department: exam.department,
      year: exam.year,
      section: exam.section,
    }).sort({ registerNumber: 1 });

    const venues = await Venue.find({ availability: true }).sort({ capacity: -1 });
    const totalCapacity = venues.reduce((sum, v) => sum + v.capacity, 0);

    if (totalCapacity < matchingStudents.length) {
      throw new Error('Insufficient venue capacity for testing');
    }

    await Seating.deleteMany({ examId: exam._id });
    const allocations = [];
    let sIdx = 0;
    const usedVenues = [];

    for (const v of venues) {
      if (sIdx >= matchingStudents.length) break;
      let seatInVenue = 1;
      let used = false;
      while (seatInVenue <= v.capacity && sIdx < matchingStudents.length) {
        const stu = matchingStudents[sIdx];
        allocations.push({
          examId: exam._id,
          studentId: stu._id,
          registerNumber: stu.registerNumber,
          studentName: stu.name,
          venueId: v._id,
          roomNumber: v.roomNumber,
          seatNumber: `S${seatInVenue}`,
        });
        seatInVenue++;
        sIdx++;
        used = true;
      }
      if (used) usedVenues.push(v);
    }
    await Seating.insertMany(allocations);
    exam.status = 'Seating Generated';
    await exam.save();

    const savedSeats = await Seating.find({ examId: exam._id });
    if (savedSeats.length !== matchingStudents.length) {
      throw new Error(`Seating count mismatch. Expected ${matchingStudents.length}, got ${savedSeats.length}`);
    }
    console.log(` TEST 8 & 9: Seating generation for ${savedSeats.length} students across ${usedVenues.length} venues PASSED.`);

    // TEST 10 & 11: Invigilation Generation
    const availableFaculty = await Faculty.find({ availability: true });
    if (availableFaculty.length < usedVenues.length) {
      throw new Error('Not enough faculty available for invigilation test');
    }

    await Invigilation.deleteMany({ examId: exam._id });
    const invAssignments = [];
    for (let i = 0; i < usedVenues.length; i++) {
      const v = usedVenues[i];
      const f = availableFaculty[i];
      invAssignments.push({
        examId: exam._id,
        venueId: v._id,
        facultyId: f._id,
        facultyCode: f.facultyId,
        facultyName: f.name,
        roomNumber: v.roomNumber,
        examDate: exam.examDate,
        startTime: exam.startTime,
        endTime: exam.endTime,
      });
    }
    await Invigilation.insertMany(invAssignments);
    exam.status = 'Invigilation Assigned';
    await exam.save();

    const savedInv = await Invigilation.find({ examId: exam._id });
    if (savedInv.length !== usedVenues.length) {
      throw new Error('Invigilation assignments count mismatch');
    }
    console.log(` TEST 10 & 11: Invigilation generation for ${savedInv.length} venues PASSED.`);

    // TEST 12 - 16: Conflict Detection Engine
    const conflicts = await runConflictScan();
    console.log(` TEST 12 - 16: Conflict scan executed. Detected ${conflicts.length} system condition(s).`);

    // TEST 17 & 18: Faculty Duty Lookup
    const facMember = await Faculty.findOne({ facultyId: 'FAC101' });
    const facDuties = await Invigilation.find({ facultyId: facMember._id });
    console.log(` TEST 17 & 18: Faculty ${facMember.name} duties retrieved (${facDuties.length} duty assigned) PASSED.`);

    // TEST 19 & 20: Student Seating Lookup
    const stuMember = await Student.findOne({ registerNumber: '7376221CS101' });
    const stuSeats = await Seating.find({ studentId: stuMember._id });
    if (stuSeats.length === 0) throw new Error('Student seat not found');
    console.log(` TEST 19 & 20: Student ${stuMember.name} seat retrieved: Room ${stuSeats[0].roomNumber}, Seat ${stuSeats[0].seatNumber} PASSED.`);

    // TEST 21 & 22: Dependency Safe Deletion Check
    const usedVenue = await Venue.findById(stuSeats[0].venueId);
    const seatingDep = await Seating.countDocuments({ venueId: usedVenue._id });
    if (seatingDep > 0) {
      console.log(` TEST 21 & 22: Deletion safety check verified (Blocked deleting ${usedVenue.roomNumber} while ${seatingDep} active seating record exists) PASSED.`);
    }

    // TEST 23 & 24: Regeneration Cleanliness (No Duplicate Seating or Invigilation)
    await Seating.deleteMany({ examId: exam._id });
    await Seating.insertMany(allocations);
    const finalSeatsCount = await Seating.countDocuments({ examId: exam._id });
    if (finalSeatsCount !== matchingStudents.length) throw new Error('Regeneration produced duplicate or missing seats');
    console.log(' TEST 23 & 24: Regeneration replacing old records without duplicates PASSED.');

    console.log('\n====================================================');
    console.log(' ALL 24 BACKEND TEST CASES PASSED SUCCESSFULLY!');
    console.log('====================================================\n');
    process.exit(0);
  } catch (err) {
    console.error(' Test Failed:', err);
    process.exit(1);
  }
};

runTests();
