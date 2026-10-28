const mongoose = require('mongoose');

const conflictSchema = new mongoose.Schema(
  {
    conflictType: {
      type: String,
      required: true,
      enum: [
        'FACULTY_TIMETABLE',
        'VENUE_TIMETABLE',
        'EXAM_TIMETABLE',
        'MISSING_INVIGILATION',
        'INSUFFICIENT_FACULTY',
        'UNAVAILABLE_FACULTY',
        'UNAVAILABLE_VENUE',
        'INSUFFICIENT_CAPACITY',
        'MISSING_STUDENTS',
        'INVALID_EXAM_TIMING',
        'DUPLICATE_SEATING',
      ],
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    severity: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
      default: 'High',
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
    },
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
    },
    venueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue',
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    suggestedSolution: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Unresolved', 'Resolved', 'Acknowledged'],
      default: 'Unresolved',
    },
    detectedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Conflict', conflictSchema);
