const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const pdfParse = require('pdf-parse');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const Venue = require('../models/Venue');
const Exam = require('../models/Exam');
const { protect, authorize } = require('../middleware/authMiddleware');

// Use in-memory storage for uploaded files
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'application/csv',
      'text/plain',
      'application/pdf',
    ];
    const ext = file.originalname.toLowerCase();
    if (
      allowed.includes(file.mimetype) ||
      ext.endsWith('.xlsx') ||
      ext.endsWith('.xls') ||
      ext.endsWith('.csv') ||
      ext.endsWith('.pdf')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Please upload an Excel (.xlsx/.xls), CSV, or PDF file.'));
    }
  },
});

// ─────────────────────────────────────────────────────────────────
// COLUMN MATCHING — identify data type from headers
// ─────────────────────────────────────────────────────────────────

const STUDENT_KEYS = ['registernumber', 'regno', 'rollno', 'rollnumber', 'studentid'];
const FACULTY_KEYS = ['facultyid', 'staffid', 'employeeid', 'empid'];
const VENUE_KEYS = ['roomnumber', 'roomno', 'hallno', 'hallnumber', 'venuename', 'capacity'];
const EXAM_KEYS = ['subject', 'subjectname', 'examdate', 'starttime', 'endtime'];

const normalizeKey = (key) =>
  String(key).toLowerCase().replace(/[\s_\-\.]/g, '');

const detectDataType = (headers) => {
  const normalized = headers.map(normalizeKey);

  const studentScore = STUDENT_KEYS.filter((k) => normalized.some((h) => h.includes(k))).length;
  const facultyScore = FACULTY_KEYS.filter((k) => normalized.some((h) => h.includes(k))).length;
  const venueScore = VENUE_KEYS.filter((k) => normalized.some((h) => h.includes(k))).length;
  const examScore = EXAM_KEYS.filter((k) => normalized.some((h) => h.includes(k))).length;

  const scores = { student: studentScore, faculty: facultyScore, venue: venueScore, exam: examScore };
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];

  if (best[1] === 0) return 'unknown';
  return best[0];
};

// Map raw row object to normalized field names
const mapRowToStudent = (row, headers) => {
  const norm = {};
  Object.entries(row).forEach(([k, v]) => {
    norm[normalizeKey(k)] = v;
  });

  return {
    name:
      norm['name'] ||
      norm['studentname'] ||
      norm['fullname'] ||
      norm['studentfullname'] ||
      '',
    registerNumber:
      norm['registernumber'] ||
      norm['regno'] ||
      norm['rollno'] ||
      norm['rollnumber'] ||
      norm['studentid'] ||
      '',
    department: norm['department'] || norm['dept'] || norm['branch'] || '',
    year: norm['year'] || norm['yearofstudy'] || norm['studyyear'] || '',
    section: norm['section'] || norm['class'] || norm['div'] || norm['division'] || '',
    email: norm['email'] || norm['emailid'] || norm['mail'] || '',
  };
};

const mapRowToFaculty = (row) => {
  const norm = {};
  Object.entries(row).forEach(([k, v]) => {
    norm[normalizeKey(k)] = v;
  });

  return {
    name: norm['name'] || norm['facultyname'] || norm['staffname'] || norm['fullname'] || '',
    facultyId:
      norm['facultyid'] ||
      norm['staffid'] ||
      norm['employeeid'] ||
      norm['empid'] ||
      '',
    department: norm['department'] || norm['dept'] || norm['branch'] || '',
    availability:
      norm['availability'] !== undefined
        ? String(norm['availability']).toLowerCase() === 'false' ||
          String(norm['availability']).toLowerCase() === 'no' ||
          String(norm['availability']).toLowerCase() === '0'
          ? false
          : true
        : true,
    email: norm['email'] || norm['emailid'] || '',
    phone: norm['phone'] || norm['mobile'] || norm['contact'] || '',
  };
};

const mapRowToVenue = (row) => {
  const norm = {};
  Object.entries(row).forEach(([k, v]) => {
    norm[normalizeKey(k)] = v;
  });

  return {
    venueName: norm['venuename'] || norm['hallname'] || norm['roomname'] || norm['name'] || '',
    roomNumber:
      norm['roomnumber'] ||
      norm['roomno'] ||
      norm['hallno'] ||
      norm['room'] ||
      norm['hall'] ||
      '',
    capacity: norm['capacity'] || norm['seats'] || norm['strength'] || '',
    floor: norm['floor'] || norm['floorno'] || 'Ground Floor',
    availability:
      norm['availability'] !== undefined
        ? String(norm['availability']).toLowerCase() === 'false' ||
          String(norm['availability']).toLowerCase() === 'no' ||
          String(norm['availability']).toLowerCase() === '0'
          ? false
          : true
        : true,
  };
};

const mapRowToExam = (row) => {
  const norm = {};
  Object.entries(row).forEach(([k, v]) => {
    norm[normalizeKey(k)] = v;
  });

  // Parse dates from Excel (Excel stores dates as number of days since 1900-01-01)
  let examDate = norm['examdate'] || norm['date'] || norm['examday'] || '';
  if (typeof examDate === 'number') {
    // Excel date serial number
    const excelEpoch = new Date(1900, 0, 1);
    const d = new Date(excelEpoch.getTime() + (examDate - 2) * 86400000);
    examDate = d.toISOString().split('T')[0];
  } else if (examDate) {
    examDate = String(examDate).trim();
  }

  return {
    subject: norm['subject'] || norm['subjectname'] || norm['coursename'] || norm['exam'] || '',
    subjectCode: norm['subjectcode'] || norm['code'] || norm['coursecode'] || '',
    examDate,
    startTime:
      norm['starttime'] ||
      norm['start'] ||
      norm['fromtime'] ||
      norm['timefrom'] ||
      '',
    endTime:
      norm['endtime'] ||
      norm['end'] ||
      norm['totime'] ||
      norm['timeto'] ||
      '',
    department: norm['department'] || norm['dept'] || norm['branch'] || '',
    year: norm['year'] || norm['yearstudy'] || norm['studyyear'] || '',
    section: norm['section'] || norm['class'] || norm['div'] || '',
  };
};

// ─────────────────────────────────────────────────────────────────
// Parse Excel / CSV Buffer
// ─────────────────────────────────────────────────────────────────
const parseExcelOrCSV = (buffer, filename) => {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const results = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (jsonData.length === 0) continue;

    const headers = Object.keys(jsonData[0]);
    const detectedType = detectDataType(headers);

    results.push({
      sheetName,
      detectedType,
      headers,
      rawRows: jsonData,
    });
  }

  return results;
};

// ─────────────────────────────────────────────────────────────────
// Parse PDF Buffer — extract text, try to identify table data
// ─────────────────────────────────────────────────────────────────
const parsePDFBuffer = async (buffer) => {
  const pdfData = await pdfParse(buffer);
  const text = pdfData.text;

  // Try to find lines that look like table rows (tab-separated or multiple spaces)
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 5);

  // Attempt to detect header line
  const possibleHeaders = lines.slice(0, 20);
  let headerLineIdx = -1;
  let headerLine = null;

  const combinedKeys = [
    ...STUDENT_KEYS,
    ...FACULTY_KEYS,
    ...VENUE_KEYS,
    ...EXAM_KEYS,
    'name',
    'department',
  ];

  for (let i = 0; i < possibleHeaders.length; i++) {
    const normalizedLine = normalizeKey(possibleHeaders[i]);
    const matchCount = combinedKeys.filter((k) => normalizedLine.includes(k)).length;
    if (matchCount >= 2) {
      headerLineIdx = i;
      headerLine = possibleHeaders[i];
      break;
    }
  }

  if (headerLineIdx === -1) {
    return {
      success: false,
      message:
        'Could not identify a structured table in this PDF. The PDF may not have machine-readable text or the format is too ambiguous. Please review the extracted data before importing.',
      extractedText: text.substring(0, 2000),
      rows: [],
      detectedType: 'unknown',
    };
  }

  // Split header line into columns (handle multiple spaces or tabs)
  const headers = headerLine
    .split(/\s{2,}|\t/)
    .map((h) => h.trim())
    .filter((h) => h);

  const dataLines = lines.slice(headerLineIdx + 1);
  const rows = [];

  dataLines.forEach((line) => {
    const parts = line.split(/\s{2,}|\t/).map((p) => p.trim());
    if (parts.length >= Math.floor(headers.length * 0.6)) {
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = parts[idx] || '';
      });
      rows.push(row);
    }
  });

  const detectedType = detectDataType(headers);

  return {
    success: true,
    headers,
    rows,
    detectedType,
    message:
      rows.length === 0
        ? 'Some information could not be identified from this PDF. Please review the extracted data before importing.'
        : null,
  };
};

// ─────────────────────────────────────────────────────────────────
// Validate & process records by type
// ─────────────────────────────────────────────────────────────────
const processStudentRecords = (rows) => {
  const valid = [];
  const invalid = [];
  const regSet = new Set();

  rows.forEach((row, idx) => {
    const mapped = mapRowToStudent(row);
    const errors = [];

    if (!mapped.name?.toString().trim()) errors.push('Name is required');
    if (!mapped.registerNumber?.toString().trim()) errors.push('Register number is required');
    else if (regSet.has(String(mapped.registerNumber).toUpperCase()))
      errors.push('Duplicate register number in file');
    else regSet.add(String(mapped.registerNumber).toUpperCase());

    if (!mapped.department?.toString().trim()) errors.push('Department is required');

    const yr = parseInt(mapped.year);
    if (!yr || yr < 1 || yr > 4) errors.push('Year must be 1–4');
    else mapped.year = yr;

    if (!mapped.section?.toString().trim()) errors.push('Section is required');

    mapped.name = String(mapped.name).trim();
    mapped.registerNumber = String(mapped.registerNumber).trim().toUpperCase();
    mapped.department = String(mapped.department).trim().toUpperCase();
    mapped.section = String(mapped.section).trim().toUpperCase();
    mapped.email = mapped.email ? String(mapped.email).trim().toLowerCase() : '';

    if (errors.length > 0) {
      invalid.push({ rowIndex: idx + 2, errors, data: mapped });
    } else {
      valid.push(mapped);
    }
  });

  return { valid, invalid };
};

const processFacultyRecords = (rows) => {
  const valid = [];
  const invalid = [];
  const idSet = new Set();

  rows.forEach((row, idx) => {
    const mapped = mapRowToFaculty(row);
    const errors = [];

    if (!mapped.name?.toString().trim()) errors.push('Name is required');
    if (!mapped.facultyId?.toString().trim()) errors.push('Faculty ID is required');
    else if (idSet.has(String(mapped.facultyId).toUpperCase()))
      errors.push('Duplicate Faculty ID in file');
    else idSet.add(String(mapped.facultyId).toUpperCase());

    if (!mapped.department?.toString().trim()) errors.push('Department is required');

    mapped.name = String(mapped.name).trim();
    mapped.facultyId = String(mapped.facultyId).trim().toUpperCase();
    mapped.department = String(mapped.department).trim().toUpperCase();
    mapped.email = mapped.email ? String(mapped.email).trim().toLowerCase() : '';
    mapped.phone = mapped.phone ? String(mapped.phone).trim() : '';

    if (errors.length > 0) {
      invalid.push({ rowIndex: idx + 2, errors, data: mapped });
    } else {
      valid.push(mapped);
    }
  });

  return { valid, invalid };
};

const processVenueRecords = (rows) => {
  const valid = [];
  const invalid = [];
  const roomSet = new Set();

  rows.forEach((row, idx) => {
    const mapped = mapRowToVenue(row);
    const errors = [];

    if (!mapped.venueName?.toString().trim()) errors.push('Venue name is required');
    if (!mapped.roomNumber?.toString().trim()) errors.push('Room number is required');
    else if (roomSet.has(String(mapped.roomNumber).toUpperCase()))
      errors.push('Duplicate room number in file');
    else roomSet.add(String(mapped.roomNumber).toUpperCase());

    const cap = parseInt(mapped.capacity);
    if (!cap || cap < 1) errors.push('Capacity must be greater than 0');
    else mapped.capacity = cap;

    mapped.venueName = String(mapped.venueName).trim();
    mapped.roomNumber = String(mapped.roomNumber).trim().toUpperCase();
    mapped.floor = mapped.floor ? String(mapped.floor).trim() : 'Ground Floor';

    if (errors.length > 0) {
      invalid.push({ rowIndex: idx + 2, errors, data: mapped });
    } else {
      valid.push(mapped);
    }
  });

  return { valid, invalid };
};

const processExamRecords = (rows) => {
  const valid = [];
  const invalid = [];

  rows.forEach((row, idx) => {
    const mapped = mapRowToExam(row);
    const errors = [];

    if (!mapped.subject?.toString().trim()) errors.push('Subject is required');
    if (!mapped.examDate?.toString().trim()) errors.push('Exam date is required');
    else {
      const d = new Date(mapped.examDate);
      if (isNaN(d.getTime())) errors.push('Invalid exam date format');
      else mapped.examDate = d;
    }

    if (!mapped.startTime?.toString().trim()) errors.push('Start time is required');
    if (!mapped.endTime?.toString().trim()) errors.push('End time is required');
    if (!mapped.department?.toString().trim()) errors.push('Department is required');

    const yr = parseInt(mapped.year);
    if (!yr || yr < 1 || yr > 4) errors.push('Year must be 1–4');
    else mapped.year = yr;

    if (!mapped.section?.toString().trim()) errors.push('Section is required');

    mapped.subject = String(mapped.subject).trim();
    mapped.department = String(mapped.department).trim().toUpperCase();
    mapped.section = String(mapped.section).trim().toUpperCase();
    mapped.startTime = String(mapped.startTime).trim();
    mapped.endTime = String(mapped.endTime).trim();

    if (errors.length > 0) {
      invalid.push({ rowIndex: idx + 2, errors, data: mapped });
    } else {
      valid.push(mapped);
    }
  });

  return { valid, invalid };
};

// ─────────────────────────────────────────────────────────────────
// @route   POST /api/import/preview
// @desc    Upload file, parse, identify, and return preview (no DB writes)
// @access  Private (Admin)
// ─────────────────────────────────────────────────────────────────
router.post('/preview', protect, authorize('admin'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded. Please select an Excel, CSV, or PDF file.' });
    }

    const filename = req.file.originalname.toLowerCase();
    const isPdf = filename.endsWith('.pdf');
    const isExcelOrCsv = filename.endsWith('.xlsx') || filename.endsWith('.xls') || filename.endsWith('.csv');

    let sheets = [];

    if (isPdf) {
      const result = await parsePDFBuffer(req.file.buffer);
      if (!result.success) {
        return res.json({
          success: true,
          fileType: 'pdf',
          warning: result.message,
          extractedText: result.extractedText,
          sheets: [],
        });
      }

      const processedRows = buildProcessedRows(result.detectedType, result.rows);

      sheets.push({
        sheetName: 'PDF Extract',
        detectedType: result.detectedType,
        headers: result.headers,
        ...processedRows,
        warning: result.message || null,
      });
    } else if (isExcelOrCsv) {
      const parsedSheets = parseExcelOrCSV(req.file.buffer, filename);

      if (parsedSheets.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Could not read data from the uploaded file. The file may be empty or corrupted.',
        });
      }

      for (const sheet of parsedSheets) {
        const processedRows = buildProcessedRows(sheet.detectedType, sheet.rawRows);
        sheets.push({
          sheetName: sheet.sheetName,
          detectedType: sheet.detectedType,
          headers: sheet.headers,
          ...processedRows,
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Unsupported file type. Please upload an Excel (.xlsx/.xls), CSV, or PDF file.',
      });
    }

    res.json({
      success: true,
      filename: req.file.originalname,
      fileType: isPdf ? 'pdf' : 'excel',
      sheets,
    });
  } catch (error) {
    next(error);
  }
});

// Helper: Process rows by detected type
const buildProcessedRows = (detectedType, rawRows) => {
  let result = { validRecords: [], invalidRecords: [], totalRecords: rawRows.length };

  if (detectedType === 'student') {
    const { valid, invalid } = processStudentRecords(rawRows);
    result.validRecords = valid;
    result.invalidRecords = invalid;
  } else if (detectedType === 'faculty') {
    const { valid, invalid } = processFacultyRecords(rawRows);
    result.validRecords = valid;
    result.invalidRecords = invalid;
  } else if (detectedType === 'venue') {
    const { valid, invalid } = processVenueRecords(rawRows);
    result.validRecords = valid;
    result.invalidRecords = invalid;
  } else if (detectedType === 'exam') {
    const { valid, invalid } = processExamRecords(rawRows);
    result.validRecords = valid;
    result.invalidRecords = invalid;
  } else {
    result.warning =
      'Could not identify the data type from the column headers. Please verify the file structure and try again.';
  }

  return result;
};

// ─────────────────────────────────────────────────────────────────
// @route   POST /api/import/confirm
// @desc    Save confirmed preview records to MongoDB
// @access  Private (Admin)
// ─────────────────────────────────────────────────────────────────
router.post('/confirm', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { dataType, records } = req.body;

    if (!dataType || !records || !Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid import request. dataType and records array are required.',
      });
    }

    if (records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No records to import. Please check the preview and try again.',
      });
    }

    let inserted = 0;
    let skipped = 0;
    let errors = [];

    if (dataType === 'student') {
      for (const rec of records) {
        try {
          const exists = await Student.findOne({ registerNumber: rec.registerNumber.toUpperCase() });
          if (exists) {
            skipped++;
          } else {
            await Student.create({
              name: rec.name,
              registerNumber: rec.registerNumber.toUpperCase(),
              department: rec.department.toUpperCase(),
              year: parseInt(rec.year),
              section: rec.section.toUpperCase(),
              email: rec.email || '',
            });
            inserted++;
          }
        } catch (err) {
          errors.push(`Row (${rec.registerNumber}): ${err.message}`);
        }
      }
    } else if (dataType === 'faculty') {
      for (const rec of records) {
        try {
          const exists = await Faculty.findOne({ facultyId: rec.facultyId.toUpperCase() });
          if (exists) {
            skipped++;
          } else {
            await Faculty.create({
              name: rec.name,
              facultyId: rec.facultyId.toUpperCase(),
              department: rec.department.toUpperCase(),
              availability: rec.availability !== false,
              email: rec.email || '',
              phone: rec.phone || '',
            });
            inserted++;
          }
        } catch (err) {
          errors.push(`Row (${rec.facultyId}): ${err.message}`);
        }
      }
    } else if (dataType === 'venue') {
      for (const rec of records) {
        try {
          const exists = await Venue.findOne({ roomNumber: rec.roomNumber.toUpperCase() });
          if (exists) {
            skipped++;
          } else {
            await Venue.create({
              venueName: rec.venueName,
              roomNumber: rec.roomNumber.toUpperCase(),
              capacity: parseInt(rec.capacity),
              floor: rec.floor || 'Ground Floor',
              availability: rec.availability !== false,
            });
            inserted++;
          }
        } catch (err) {
          errors.push(`Row (${rec.roomNumber}): ${err.message}`);
        }
      }
    } else if (dataType === 'exam') {
      for (const rec of records) {
        try {
          await Exam.create({
            subject: rec.subject,
            subjectCode: rec.subjectCode || '',
            examDate: new Date(rec.examDate),
            startTime: rec.startTime,
            endTime: rec.endTime,
            department: rec.department.toUpperCase(),
            year: parseInt(rec.year),
            section: rec.section.toUpperCase(),
          });
          inserted++;
        } catch (err) {
          // Could be a duplicate or validation error
          errors.push(`Row (${rec.subject}): ${err.message}`);
          skipped++;
        }
      }
    } else {
      return res.status(400).json({
        success: false,
        message: `Unknown data type: ${dataType}. Expected: student, faculty, venue, or exam.`,
      });
    }

    const summary = `Import completed: ${inserted} record(s) added, ${skipped} record(s) already existed and were skipped.`;
    const errorMsg =
      errors.length > 0
        ? `${errors.length} record(s) failed due to validation errors.`
        : '';

    res.json({
      success: true,
      message: errorMsg ? `${summary} ${errorMsg}` : summary,
      inserted,
      skipped,
      errorCount: errors.length,
      errors: errors.slice(0, 10), // Return first 10 errors max
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
