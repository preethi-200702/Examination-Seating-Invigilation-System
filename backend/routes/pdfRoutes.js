const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const Exam = require('../models/Exam');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const Venue = require('../models/Venue');
const Seating = require('../models/Seating');
const Invigilation = require('../models/Invigilation');
const { protect, authorize } = require('../middleware/authMiddleware');

// Helper: Format date nicely
const fmtDate = (d) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// Helper: Draw a simple table in PDFKit
// columns: [{header, key, width}]
// rows: array of objects
const drawTable = (doc, columns, rows, startX, startY, options = {}) => {
  const cellPadding = options.cellPadding || 5;
  const rowHeight = options.rowHeight || 22;
  const headerBgColor = options.headerBgColor || '#7c3aed';
  const headerTextColor = options.headerTextColor || '#ffffff';
  const altRowBgColor = options.altRowBgColor || '#f5f3ff';
  const fontSize = options.fontSize || 9;

  const totalWidth = columns.reduce((sum, c) => sum + c.width, 0);

  let y = startY;

  // Draw header
  doc.fillColor(headerBgColor);
  doc.rect(startX, y, totalWidth, rowHeight).fill();
  doc.fillColor(headerTextColor).fontSize(fontSize).font('Helvetica-Bold');

  let x = startX;
  columns.forEach((col) => {
    doc.text(col.header, x + cellPadding, y + cellPadding, {
      width: col.width - cellPadding * 2,
      lineBreak: false,
    });
    x += col.width;
  });

  y += rowHeight;

  // Draw rows
  rows.forEach((row, idx) => {
    // Check if we need a new page
    if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      y = doc.page.margins.top;

      // Redraw header on new page
      doc.fillColor(headerBgColor);
      doc.rect(startX, y, totalWidth, rowHeight).fill();
      doc.fillColor(headerTextColor).fontSize(fontSize).font('Helvetica-Bold');
      let hx = startX;
      columns.forEach((col) => {
        doc.text(col.header, hx + cellPadding, y + cellPadding, {
          width: col.width - cellPadding * 2,
          lineBreak: false,
        });
        hx += col.width;
      });
      y += rowHeight;
    }

    const bgColor = idx % 2 === 1 ? altRowBgColor : '#ffffff';
    doc.fillColor(bgColor);
    doc.rect(startX, y, totalWidth, rowHeight).fill();

    doc.fillColor('#0f172a').fontSize(fontSize).font('Helvetica');
    let cx = startX;
    columns.forEach((col) => {
      const val = row[col.key] !== undefined && row[col.key] !== null ? String(row[col.key]) : '-';
      doc.text(val, cx + cellPadding, y + cellPadding, {
        width: col.width - cellPadding * 2,
        lineBreak: false,
      });
      cx += col.width;
    });

    // Row border
    doc.strokeColor('#e2e8f0').lineWidth(0.5);
    doc.rect(startX, y, totalWidth, rowHeight).stroke();

    y += rowHeight;
  });

  // Draw outer border
  doc.strokeColor('#7c3aed').lineWidth(1);
  doc.rect(startX, startY, totalWidth, y - startY).stroke();

  return y;
};

// Helper: PDF page header
const drawPageHeader = (doc, title, subtitle, generatedAt) => {
  const pageW = doc.page.width;
  const margin = doc.page.margins.left;

  // Title bar
  doc.fillColor('#7c3aed');
  doc.rect(margin, doc.page.margins.top, pageW - margin * 2, 36).fill();
  doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold');
  doc.text(title, margin + 10, doc.page.margins.top + 10, {
    width: pageW - margin * 2 - 20,
  });

  let y = doc.page.margins.top + 44;

  if (subtitle) {
    doc.fillColor('#5b21b6').fontSize(10).font('Helvetica-Bold');
    doc.text(subtitle, margin, y);
    y += 18;
  }

  doc.fillColor('#94a3b8').fontSize(8).font('Helvetica');
  doc.text(`Generated on: ${generatedAt || new Date().toLocaleString('en-IN')}`, margin, y);
  y += 20;

  return y;
};

// ─────────────────────────────────────────────────────────────────
// @route   GET /api/pdf/seating/:examId/all
// @desc    Download All Students seating PDF
// @access  Private (Admin, Faculty)
// ─────────────────────────────────────────────────────────────────
router.get('/seating/:examId/all', protect, async (req, res, next) => {
  try {
    const { examId } = req.params;

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found.' });
    }

    const seatings = await Seating.find({ examId })
      .populate('studentId venueId')
      .sort({ roomNumber: 1, seatNumber: 1 });

    if (seatings.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No seating allocation exists for this examination yet. Please generate seating first.',
      });
    }

    // Sort: Department → Year → Section → RegisterNumber
    seatings.sort((a, b) => {
      const dept = (a.studentId?.department || '').localeCompare(b.studentId?.department || '');
      if (dept !== 0) return dept;
      const yr = (a.studentId?.year || 0) - (b.studentId?.year || 0);
      if (yr !== 0) return yr;
      const sec = (a.studentId?.section || '').localeCompare(b.studentId?.section || '');
      if (sec !== 0) return sec;
      return a.registerNumber.localeCompare(b.registerNumber);
    });

    const doc = new PDFDocument({ margin: 36, layout: 'landscape', size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="SeatingAllocation_AllStudents_${examId}.pdf"`
    );
    doc.pipe(res);

    const subtitle = `Exam: ${exam.subject}  |  Dept: ${exam.department}  |  Year: ${exam.year}  |  Section: ${exam.section}  |  Date: ${fmtDate(exam.examDate)}  |  Time: ${exam.startTime} - ${exam.endTime}`;
    let y = drawPageHeader(doc, 'EXAMINATION SEATING ALLOCATION — ALL STUDENTS', subtitle);

    const columns = [
      { header: 'S.No', key: 'sno', width: 38 },
      { header: 'Reg. Number', key: 'registerNumber', width: 100 },
      { header: 'Student Name', key: 'studentName', width: 130 },
      { header: 'Department', key: 'department', width: 75 },
      { header: 'Year', key: 'year', width: 38 },
      { header: 'Section', key: 'section', width: 55 },
      { header: 'Room', key: 'roomNumber', width: 65 },
      { header: 'Seat No', key: 'seatNumber', width: 55 },
    ];

    const rows = seatings.map((s, idx) => ({
      sno: idx + 1,
      registerNumber: s.registerNumber,
      studentName: s.studentName,
      department: s.studentId?.department || '-',
      year: s.studentId?.year || '-',
      section: s.studentId?.section || '-',
      roomNumber: s.roomNumber,
      seatNumber: s.seatNumber,
    }));

    const margin = doc.page.margins.left;
    drawTable(doc, columns, rows, margin, y);

    // Footer
    const pageRange = doc.bufferedPageRange();
    for (let i = 0; i < doc.bufferedPageRange().count; i++) {
      doc.switchToPage(pageRange.start + i);
      doc.fillColor('#94a3b8').fontSize(8).font('Helvetica');
      doc.text(
        `Page ${i + 1} of ${pageRange.count}   |   Examination Seating & Invigilation Management System — B.E. CSE 3rd Year Project`,
        doc.page.margins.left,
        doc.page.height - 30,
        { align: 'center', width: doc.page.width - doc.page.margins.left * 2 }
      );
    }

    doc.end();
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────
// @route   GET /api/pdf/seating/:examId/venue/:venueId
// @desc    Download Venue-wise Seating PDF (one venue)
// @access  Private (Admin, Faculty)
// ─────────────────────────────────────────────────────────────────
router.get('/seating/:examId/venue/:venueId', protect, async (req, res, next) => {
  try {
    const { examId, venueId } = req.params;

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found.' });
    }

    const venue = await Venue.findById(venueId);
    if (!venue) {
      return res.status(404).json({ success: false, message: 'Venue not found.' });
    }

    const seatings = await Seating.find({ examId, venueId })
      .populate('studentId')
      .sort({ seatNumber: 1 });

    if (seatings.length === 0) {
      return res.status(400).json({
        success: false,
        message: `No seating allocation found for Room ${venue.roomNumber} in this examination.`,
      });
    }

    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="SeatingAllocation_${venue.roomNumber}_${examId}.pdf"`
    );
    doc.pipe(res);

    const subtitle = `Exam: ${exam.subject}  |  Date: ${fmtDate(exam.examDate)}  |  Time: ${exam.startTime} - ${exam.endTime}`;
    let y = drawPageHeader(
      doc,
      `EXAMINATION SEATING — ROOM ${venue.roomNumber} (${venue.venueName})`,
      subtitle
    );

    const columns = [
      { header: 'S.No', key: 'sno', width: 45 },
      { header: 'Seat No', key: 'seatNumber', width: 65 },
      { header: 'Reg. Number', key: 'registerNumber', width: 110 },
      { header: 'Student Name', key: 'studentName', width: 150 },
      { header: 'Department', key: 'department', width: 80 },
      { header: 'Year', key: 'year', width: 40 },
      { header: 'Section', key: 'section', width: 45 },
    ];

    const rows = seatings.map((s, idx) => ({
      sno: idx + 1,
      seatNumber: s.seatNumber,
      registerNumber: s.registerNumber,
      studentName: s.studentName,
      department: s.studentId?.department || '-',
      year: s.studentId?.year || '-',
      section: s.studentId?.section || '-',
    }));

    const margin = doc.page.margins.left;
    drawTable(doc, columns, rows, margin, y);

    doc.end();
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────
// @route   GET /api/pdf/seating/:examId/venues-summary
// @desc    Download all venues summary PDF (venue-wise listing of all rooms)
// @access  Private (Admin, Faculty)
// ─────────────────────────────────────────────────────────────────
router.get('/seating/:examId/venues-summary', protect, async (req, res, next) => {
  try {
    const { examId } = req.params;

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found.' });
    }

    const seatings = await Seating.find({ examId })
      .populate('studentId venueId')
      .sort({ roomNumber: 1, seatNumber: 1 });

    if (seatings.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No seating allocation exists for this examination yet.',
      });
    }

    // Group by venue
    const venueMap = {};
    seatings.forEach((s) => {
      const key = s.roomNumber;
      if (!venueMap[key]) {
        venueMap[key] = {
          roomNumber: s.roomNumber,
          venueName: s.venueId?.venueName || s.roomNumber,
          seats: [],
        };
      }
      venueMap[key].seats.push(s);
    });

    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="SeatingAllocation_VenueSummary_${examId}.pdf"`
    );
    doc.pipe(res);

    const subtitle = `Exam: ${exam.subject}  |  ${exam.department} — Year ${exam.year} — Section ${exam.section}  |  ${fmtDate(exam.examDate)}  |  ${exam.startTime} - ${exam.endTime}`;
    let y = drawPageHeader(doc, 'EXAMINATION SEATING — VENUE-WISE ARRANGEMENT', subtitle);

    const margin = doc.page.margins.left;

    Object.values(venueMap).forEach((group, gIdx) => {
      // Section title per venue
      if (y + 80 > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        y = doc.page.margins.top;
      }

      doc.fillColor('#5b21b6').fontSize(11).font('Helvetica-Bold');
      doc.text(
        `Venue: ${group.roomNumber} — ${group.venueName}   (${group.seats.length} students)`,
        margin,
        y
      );
      y += 20;

      const columns = [
        { header: 'Seat No', key: 'seatNumber', width: 65 },
        { header: 'Reg. Number', key: 'registerNumber', width: 115 },
        { header: 'Student Name', key: 'studentName', width: 155 },
      ];

      const rows = group.seats.map((s) => ({
        seatNumber: s.seatNumber,
        registerNumber: s.registerNumber,
        studentName: s.studentName,
      }));

      y = drawTable(doc, columns, rows, margin, y, { rowHeight: 20 });
      y += 18;
    });

    doc.end();
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────
// @route   GET /api/pdf/invigilation/:examId
// @desc    Download Faculty Duty PDF (ALL faculty, assigned + unassigned)
// @access  Private (Admin only)
// ─────────────────────────────────────────────────────────────────
router.get('/invigilation/:examId', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { examId } = req.params;

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found.' });
    }

    // Get all assignments for this exam
    const assignments = await Invigilation.find({ examId }).populate('venueId facultyId');

    // Get ALL faculty
    const allFaculty = await Faculty.find().sort({ department: 1, facultyId: 1 });

    // Build assignment lookup by Faculty ObjectId
    const assignmentMap = {};
    assignments.forEach((a) => {
      const fId = a.facultyId?._id?.toString() || a.facultyId?.toString();
      if (fId) assignmentMap[fId] = a;
    });

    const doc = new PDFDocument({ margin: 36, layout: 'landscape', size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="InvigilationDuty_${examId}.pdf"`
    );
    doc.pipe(res);

    const subtitle = `Exam: ${exam.subject}  |  ${exam.department} — Year ${exam.year} — Section ${exam.section}  |  Date: ${fmtDate(exam.examDate)}  |  Time: ${exam.startTime} - ${exam.endTime}`;
    let y = drawPageHeader(doc, 'EXAMINATION INVIGILATION DUTY LIST', subtitle);

    const columns = [
      { header: 'S.No', key: 'sno', width: 38 },
      { header: 'Faculty ID', key: 'facultyId', width: 75 },
      { header: 'Faculty Name', key: 'name', width: 140 },
      { header: 'Department', key: 'department', width: 80 },
      { header: 'Availability', key: 'availability', width: 75 },
      { header: 'Exam', key: 'exam', width: 90 },
      { header: 'Venue', key: 'venue', width: 65 },
      { header: 'Date', key: 'date', width: 70 },
      { header: 'Start', key: 'start', width: 55 },
      { header: 'End', key: 'end', width: 55 },
      { header: 'Status', key: 'status', width: 80 },
    ];

    const rows = allFaculty.map((fac, idx) => {
      const assignment = assignmentMap[fac._id.toString()];
      if (assignment) {
        return {
          sno: idx + 1,
          facultyId: fac.facultyId,
          name: fac.name,
          department: fac.department,
          availability: fac.availability ? 'Available' : 'Unavailable',
          exam: exam.subject,
          venue: assignment.roomNumber || '-',
          date: fmtDate(assignment.examDate),
          start: assignment.startTime || '-',
          end: assignment.endTime || '-',
          status: 'Assigned',
        };
      } else {
        return {
          sno: idx + 1,
          facultyId: fac.facultyId,
          name: fac.name,
          department: fac.department,
          availability: fac.availability ? 'Available' : 'Unavailable',
          exam: '-',
          venue: '-',
          date: '-',
          start: '-',
          end: '-',
          status: fac.availability ? 'Not Assigned' : 'Unavailable',
        };
      }
    });

    const margin = doc.page.margins.left;
    drawTable(doc, columns, rows, margin, y);

    // Summary at bottom
    const assignedCount = assignments.length;
    const notAssignedCount = allFaculty.length - assignedCount;

    doc.addPage();
    doc.fillColor('#7c3aed').fontSize(13).font('Helvetica-Bold');
    doc.text('DUTY SUMMARY', doc.page.margins.left, doc.page.margins.top);
    doc.moveDown(0.5);
    doc.fillColor('#0f172a').fontSize(10).font('Helvetica');
    doc.text(`Total Faculty in System: ${allFaculty.length}`);
    doc.text(`Assigned to Duty: ${assignedCount}`);
    doc.text(`Not Assigned: ${notAssignedCount}`);
    doc.text(`Examination: ${exam.subject}`);
    doc.text(`Date: ${fmtDate(exam.examDate)}   Time: ${exam.startTime} - ${exam.endTime}`);

    doc.end();
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────
// @route   GET /api/pdf/invigilation/:examId/faculty/:facultyDbId
// @desc    Download individual faculty duty PDF
// @access  Private (Admin)
// ─────────────────────────────────────────────────────────────────
router.get('/invigilation/:examId/faculty/:facultyDbId', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { examId, facultyDbId } = req.params;

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Examination not found.' });
    }

    const faculty = await Faculty.findById(facultyDbId);
    if (!faculty) {
      return res.status(404).json({ success: false, message: 'Faculty member not found.' });
    }

    const assignment = await Invigilation.findOne({ examId, facultyId: facultyDbId }).populate('venueId');

    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="DutySlip_${faculty.facultyId}_${examId}.pdf"`
    );
    doc.pipe(res);

    // Header
    doc.fillColor('#7c3aed').fontSize(16).font('Helvetica-Bold');
    doc.text('EXAMINATION INVIGILATION DUTY SLIP', { align: 'center' });
    doc.moveDown(0.3);
    doc.fillColor('#5b21b6').fontSize(10).font('Helvetica');
    doc.text('Examination Seating & Invigilation Management System', { align: 'center' });
    doc.moveDown(1.5);

    // Faculty details
    doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold');
    doc.text('FACULTY DETAILS', { underline: true });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(11);

    const details = [
      ['Faculty ID', faculty.facultyId],
      ['Name', faculty.name],
      ['Department', faculty.department],
      ['Availability', faculty.availability ? 'Available' : 'Unavailable'],
    ];

    details.forEach(([label, val]) => {
      doc.text(`${label}: `, { continued: true }).font('Helvetica-Bold').text(val);
      doc.font('Helvetica');
    });

    doc.moveDown(1);
    doc.fillColor('#0f172a').fontSize(11).font('Helvetica-Bold');
    doc.text('DUTY ASSIGNMENT DETAILS', { underline: true });
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(11);

    if (assignment) {
      const dutyDetails = [
        ['Examination', exam.subject],
        ['Date', fmtDate(exam.examDate)],
        ['Start Time', assignment.startTime],
        ['End Time', assignment.endTime],
        ['Assigned Venue', assignment.roomNumber],
        ['Venue Name', assignment.venueId?.venueName || '-'],
        ['Status', 'ASSIGNED'],
      ];
      dutyDetails.forEach(([label, val]) => {
        doc.text(`${label}: `, { continued: true }).font('Helvetica-Bold').text(val);
        doc.font('Helvetica');
      });
    } else {
      doc.fillColor('#dc2626').text('No duty has been assigned for this examination.');
    }

    doc.moveDown(2);
    doc.fillColor('#94a3b8').fontSize(8).font('Helvetica');
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, { align: 'right' });

    doc.end();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
