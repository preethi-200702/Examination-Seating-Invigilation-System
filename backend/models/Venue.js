const mongoose = require('mongoose');

const venueSchema = new mongoose.Schema(
  {
    venueName: {
      type: String,
      required: [true, 'Venue name is required'],
      trim: true,
    },
    roomNumber: {
      type: String,
      required: [true, 'Room number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be greater than 0'],
    },
    floor: {
      type: String,
      trim: true,
      default: 'Ground Floor',
    },
    availability: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Venue', venueSchema);
