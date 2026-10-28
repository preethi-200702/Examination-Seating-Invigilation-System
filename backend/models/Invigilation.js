const mongoose = require('mongoose');

const invigilationSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: [true, 'Exam reference is required'],
    },
    venueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue',
      required: [true, 'Venue reference is required'],
    },
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: [true, 'Faculty reference is required'],
    },
    facultyCode: {
      type: String,
      required: [true, 'Faculty code is required'],
      trim: true,
      uppercase: true,
    },
    facultyName: {
      type: String,
      required: [true, 'Faculty name is required'],
      trim: true,
    },
    roomNumber: {
      type: String,
      required: [true, 'Room number is required'],
      trim: true,
      uppercase: true,
    },
    examDate: {
      type: Date,
      required: [true, 'Exam date is required'],
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      trim: true,
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// One invigilator per venue per exam
invigilationSchema.index({ examId: 1, venueId: 1 }, { unique: true });

// One invigilation assignment per faculty per exam
invigilationSchema.index({ examId: 1, facultyId: 1 }, { unique: true });

module.exports = mongoose.model('Invigilation', invigilationSchema);
