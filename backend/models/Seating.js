const mongoose = require('mongoose');

const seatingSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: [true, 'Exam reference is required'],
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student reference is required'],
    },
    registerNumber: {
      type: String,
      required: [true, 'Register number is required'],
      trim: true,
      uppercase: true,
    },
    studentName: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
    },
    venueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue',
      required: [true, 'Venue reference is required'],
    },
    roomNumber: {
      type: String,
      required: [true, 'Room number is required'],
      trim: true,
      uppercase: true,
    },
    seatNumber: {
      type: String,
      required: [true, 'Seat number is required'],
      trim: true,
      uppercase: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure one seat per student per exam
seatingSchema.index({ examId: 1, studentId: 1 }, { unique: true });

// Ensure unique seat per room per exam
seatingSchema.index({ examId: 1, venueId: 1, seatNumber: 1 }, { unique: true });

module.exports = mongoose.model('Seating', seatingSchema);
