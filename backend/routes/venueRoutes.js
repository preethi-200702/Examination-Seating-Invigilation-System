const express = require('express');
const router = express.Router();
const Venue = require('../models/Venue');
const Seating = require('../models/Seating');
const Invigilation = require('../models/Invigilation');
const { protect, authorize } = require('../middleware/authMiddleware');

// @route   GET /api/venues
// @desc    Get all venues with search & filter
// @access  Private
router.get('/', protect, async (req, res, next) => {
  try {
    const { search, availability } = req.query;
    let query = {};

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [{ venueName: searchRegex }, { roomNumber: searchRegex }, { floor: searchRegex }];
    }

    if (availability !== undefined && availability !== '') {
      query.availability = availability === 'true' || availability === true;
    }

    const venues = await Venue.find(query).sort({ roomNumber: 1 });
    res.json({
      success: true,
      count: venues.length,
      venues,
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/venues/:id
// @desc    Get single venue
// @access  Private
router.get('/:id', protect, async (req, res, next) => {
  try {
    const venue = await Venue.findById(req.params.id);
    if (!venue) {
      return res.status(404).json({
        success: false,
        message: 'Venue record not found.',
      });
    }
    res.json({ success: true, venue });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/venues
// @desc    Add a new venue
// @access  Private (Admin only)
router.post('/', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { venueName, roomNumber, capacity, floor, availability } = req.body;

    if (!venueName || !roomNumber || capacity === undefined || capacity === null) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: Venue Name, Room Number, and Capacity.',
      });
    }

    if (Number(capacity) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Capacity must be greater than 0.',
      });
    }

    const formattedRoom = roomNumber.toUpperCase().trim();

    const existingVenue = await Venue.findOne({ roomNumber: formattedRoom });
    if (existingVenue) {
      return res.status(409).json({
        success: false,
        message: `Venue could not be added. Room number "${formattedRoom}" already exists.`,
      });
    }

    const venue = await Venue.create({
      venueName: venueName.trim(),
      roomNumber: formattedRoom,
      capacity: Number(capacity),
      floor: floor ? floor.trim() : 'Ground Floor',
      availability: availability !== undefined ? availability : true,
    });

    res.status(201).json({
      success: true,
      message: 'Venue added successfully.',
      venue,
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/venues/:id
// @desc    Update venue details
// @access  Private (Admin only)
router.put('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { venueName, roomNumber, capacity, floor, availability } = req.body;

    const venue = await Venue.findById(req.params.id);
    if (!venue) {
      return res.status(404).json({
        success: false,
        message: 'Venue record not found.',
      });
    }

    if (capacity !== undefined && Number(capacity) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Capacity must be greater than 0.',
      });
    }

    const oldRoom = venue.roomNumber;
    const newRoom = roomNumber ? roomNumber.toUpperCase().trim() : oldRoom;

    if (newRoom !== oldRoom) {
      const duplicate = await Venue.findOne({ roomNumber: newRoom, _id: { $ne: venue._id } });
      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: `Cannot update. Room number "${newRoom}" is already assigned to another venue.`,
        });
      }
    }

    venue.venueName = venueName ? venueName.trim() : venue.venueName;
    venue.roomNumber = newRoom;
    if (capacity !== undefined) venue.capacity = Number(capacity);
    if (floor !== undefined) venue.floor = floor.trim();
    if (availability !== undefined) venue.availability = Boolean(availability);

    await venue.save();

    res.json({
      success: true,
      message: 'Venue updated successfully.',
      venue,
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/venues/:id
// @desc    Delete a venue safely
// @access  Private (Admin only)
router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const venue = await Venue.findById(req.params.id);
    if (!venue) {
      return res.status(404).json({
        success: false,
        message: 'Venue record not found.',
      });
    }

    // Safety check: Check if venue is referenced in seating or invigilation
    const seatingCount = await Seating.countDocuments({ venueId: venue._id });
    const invigilationCount = await Invigilation.countDocuments({ venueId: venue._id });

    if (seatingCount > 0 || invigilationCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Venue cannot be deleted because ${seatingCount} seating record(s) and ${invigilationCount} invigilation duty assignment(s) are using this venue. Delete or regenerate the related seating first.`,
      });
    }

    await Venue.findByIdAndDelete(venue._id);

    res.json({
      success: true,
      message: 'Venue deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
