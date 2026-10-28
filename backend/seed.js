const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Student = require('./models/Student');
const Faculty = require('./models/Faculty');
const Venue = require('./models/Venue');
const Exam = require('./models/Exam');
const Seating = require('./models/Seating');
const Invigilation = require('./models/Invigilation');
const Conflict = require('./models/Conflict');

dotenv.config();

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/exam_seating_db');
    console.log('Connected to MongoDB for database seeding...');

    // Clear existing records
    await Promise.all([
      User.deleteMany(),
      Student.deleteMany(),
      Faculty.deleteMany(),
      Venue.deleteMany(),
      Exam.deleteMany(),
      Seating.deleteMany(),
      Invigilation.deleteMany(),
      Conflict.deleteMany(),
    ]);

    console.log('Cleared existing data.');

    // 1. Create Admin User
    const adminUser = await User.create({
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      name: 'Prof. S. Ramanathan (Exam Controller)',
      email: 'examcell@college.edu',
      refId: 'ADMIN01',
    });
    console.log('Created Admin User: admin / admin123');

    // 2. Create Faculty Members & Login Users
    const facultyData = [
      {
        name: 'Dr. Rajesh Kumar',
        facultyId: 'FAC101',
        department: 'CSE',
        availability: true,
        email: 'rajesh.kumar@college.edu',
        phone: '9876543210',
      },
      {
        name: 'Dr. Priya Sharma',
        facultyId: 'FAC102',
        department: 'CSE',
        availability: true,
        email: 'priya.sharma@college.edu',
        phone: '9876543211',
      },
      {
        name: 'Prof. Ananth Verma',
        facultyId: 'FAC103',
        department: 'IT',
        availability: true,
        email: 'ananth.verma@college.edu',
        phone: '9876543212',
      },
      {
        name: 'Dr. Sneha Reddy',
        facultyId: 'FAC104',
        department: 'ECE',
        availability: true,
        email: 'sneha.reddy@college.edu',
        phone: '9876543213',
      },
      {
        name: 'Prof. Karthik Sundaram',
        facultyId: 'FAC105',
        department: 'CSE',
        availability: true,
        email: 'karthik.sundaram@college.edu',
        phone: '9876543214',
      },
      {
        name: 'Prof. Meenakshi Iyer',
        facultyId: 'FAC106',
        department: 'CSE',
        availability: false, // Marked unavailable for conflict testing
        email: 'meenakshi.iyer@college.edu',
        phone: '9876543215',
      },
    ];

    const createdFaculties = await Faculty.insertMany(facultyData);

    for (const fac of createdFaculties) {
      await User.create({
        username: fac.facultyId.toLowerCase(),
        password: 'faculty123',
        role: 'faculty',
        name: fac.name,
        email: fac.email,
        refId: fac.facultyId,
      });
    }
    console.log(`Created ${createdFaculties.length} Faculty members and user accounts.`);

    // 3. Create Venues
    const venueData = [
      {
        venueName: 'Main Block - Lecture Hall 1',
        roomNumber: 'LH-101',
        capacity: 15,
        floor: '1st Floor',
        availability: true,
      },
      {
        venueName: 'Main Block - Lecture Hall 2',
        roomNumber: 'LH-102',
        capacity: 15,
        floor: '1st Floor',
        availability: true,
      },
      {
        venueName: 'CS Block - Seminar Hall',
        roomNumber: 'SH-201',
        capacity: 20,
        floor: '2nd Floor',
        availability: true,
      },
      {
        venueName: 'Science Block - Room 301',
        roomNumber: 'SB-301',
        capacity: 10,
        floor: '3rd Floor',
        availability: false, // Inactive venue for conflict testing
      },
    ];

    const createdVenues = await Venue.insertMany(venueData);
    console.log(`Created ${createdVenues.length} Examination Venues.`);

    // 4. Create Students (3rd Year CSE Section A)
    const studentNames = [
      'Aarav Patel', 'Aditi Sharma', 'Akash Sundaram', 'Ananya Gupta', 'Bhavya Nair',
      'Charan Kumar', 'Deepak Verma', 'Divya Krishnan', 'Gautam Raj', 'Harini Rao',
      'Ishaan Malhotra', 'Janani Venkatesh', 'Kavya Pillai', 'Manoj Kumar', 'Naveen Prakash',
      'Niharika Das', 'Pooja Hegde', 'Pranav Menon', 'Rahul Dravid', 'Rohan Sengupta',
      'Sai Prasanth', 'Sanjay Dutt', 'Shruti Hassan', 'Siddharth Roy', 'Sneha Paul',
      'Surya Narayanan', 'Swathi Reddy', 'Tanvi Joshi', 'Tarun Vijay', 'Varun Dhawan'
    ];

    const studentRecords = studentNames.map((name, index) => {
      const regNum = `7376221CS${String(101 + index).padStart(3, '0')}`;
      return {
        name,
        registerNumber: regNum,
        department: 'CSE',
        year: 3,
        section: 'A',
        email: `${regNum.toLowerCase()}@student.college.edu`,
      };
    });

    const createdStudents = await Student.insertMany(studentRecords);

    for (const stu of createdStudents) {
      await User.create({
        username: stu.registerNumber.toLowerCase(),
        password: 'student123',
        role: 'student',
        name: stu.name,
        email: stu.email,
        refId: stu.registerNumber,
      });
    }
    console.log(`Created ${createdStudents.length} Students (CSE 3rd Year Sec A) and student accounts.`);

    // 5. Create Sample Examinations
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const dayAfter = new Date(today);
    dayAfter.setDate(today.getDate() + 2);

    const examData = [
      {
        subject: 'CS3501 - Compiler Design',
        subjectCode: 'CS3501',
        examDate: tomorrow,
        startTime: '09:30 AM',
        endTime: '12:30 PM',
        department: 'CSE',
        year: 3,
        section: 'A',
        status: 'Scheduled',
      },
      {
        subject: 'CS3502 - Database Management Systems',
        subjectCode: 'CS3502',
        examDate: dayAfter,
        startTime: '09:30 AM',
        endTime: '12:30 PM',
        department: 'CSE',
        year: 3,
        section: 'A',
        status: 'Scheduled',
      },
      {
        subject: 'CS3503 - Computer Networks',
        subjectCode: 'CS3503',
        examDate: dayAfter,
        startTime: '02:00 PM',
        endTime: '05:00 PM',
        department: 'CSE',
        year: 3,
        section: 'A',
        status: 'Scheduled',
      },
    ];

    const createdExams = await Exam.insertMany(examData);
    console.log(`Created ${createdExams.length} Examinations.`);

    console.log('\n====================================================');
    console.log('DATABASE SEEDED SUCCESSFULLY!');
    console.log('----------------------------------------------------');
    console.log('DEMO CREDENTIALS:');
    console.log('Admin:   Username: admin         | Password: admin123');
    console.log('Faculty: Username: fac101        | Password: faculty123');
    console.log('Faculty: Username: fac102        | Password: faculty123');
    console.log('Student: Username: 7376221cs101  | Password: student123');
    console.log('Student: Username: 7376221cs102  | Password: student123');
    console.log('====================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
