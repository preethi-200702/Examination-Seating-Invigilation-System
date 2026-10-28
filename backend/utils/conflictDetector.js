const Exam = require('../models/Exam');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const Venue = require('../models/Venue');
const Seating = require('../models/Seating');
const Invigilation = require('../models/Invigilation');
const Conflict = require('../models/Conflict');

// Parse time string (e.g. "09:30 AM", "09:30", "14:00", "02:00 PM") to total minutes from midnight
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const str = timeStr.trim().toUpperCase();
  const isPM = str.includes('PM');
  const isAM = str.includes('AM');
  const cleanStr = str.replace(/AM|PM/g, '').trim();
  const [hoursStr, minsStr] = cleanStr.split(':');
  let hours = parseInt(hoursStr, 10) || 0;
  const mins = parseInt(minsStr, 10) || 0;
  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;
  return hours * 60 + mins;
};

// Check if two time slots on the same date overlap
const isTimeOverlap = (date1, start1, end1, date2, start2, end2) => {
  const d1 = new Date(date1).toISOString().split('T')[0];
  const d2 = new Date(date2).toISOString().split('T')[0];
  if (d1 !== d2) return false;

  const s1 = parseTimeToMinutes(start1);
  const e1 = parseTimeToMinutes(end1);
  const s2 = parseTimeToMinutes(start2);
  const e2 = parseTimeToMinutes(end2);

  return Math.max(s1, s2) < Math.min(e1, e2);
};

// Run comprehensive conflict detection across the whole system
const runConflictScan = async () => {
  const detectedConflicts = [];

  const exams = await Exam.find();
  const students = await Student.find();
  const faculties = await Faculty.find();
  const venues = await Venue.find();
  const seatings = await Seating.find().populate('examId venueId studentId');
  const invigilations = await Invigilation.find().populate('examId venueId facultyId');

  // Map of available venues and active capacity
  const availableVenues = venues.filter((v) => v.availability);
  const totalAvailableCapacity = availableVenues.reduce((sum, v) => sum + (v.capacity || 0), 0);
  const availableFacultyCount = faculties.filter((f) => f.availability).length;

  // 1. Check Invalid Exam Timings & Missing Students per Exam
  for (const exam of exams) {
    const startMins = parseTimeToMinutes(exam.startTime);
    const endMins = parseTimeToMinutes(exam.endTime);

    if (endMins <= startMins) {
      detectedConflicts.push({
        conflictType: 'INVALID_EXAM_TIMING',
        title: `Invalid Exam Timing: ${exam.subject}`,
        description: `Exam end time (${exam.endTime}) is scheduled before or equal to start time (${exam.startTime}) for ${exam.subject} (${exam.department} - Year ${exam.year} Sec ${exam.section}).`,
        severity: 'High',
        examId: exam._id,
        details: {
          subject: exam.subject,
          date: new Date(exam.examDate).toLocaleDateString(),
          startTime: exam.startTime,
          endTime: exam.endTime,
        },
        suggestedSolution: 'Update the exam schedule with an end time later than start time.',
      });
    }

    // Check matching students
    const matchingStudents = students.filter(
      (s) =>
        s.department === exam.department &&
        Number(s.year) === Number(exam.year) &&
        s.section === exam.section
    );

    if (matchingStudents.length === 0) {
      detectedConflicts.push({
        conflictType: 'MISSING_STUDENTS',
        title: `No Students Registered: ${exam.subject}`,
        description: `No students found matching Department ${exam.department}, Year ${exam.year}, Section ${exam.section} for examination "${exam.subject}".`,
        severity: 'Medium',
        examId: exam._id,
        details: {
          department: exam.department,
          year: exam.year,
          section: exam.section,
        },
        suggestedSolution: `Add students enrolled in ${exam.department} Year ${exam.year} Section ${exam.section} or modify exam criteria.`,
      });
    } else if (matchingStudents.length > totalAvailableCapacity) {
      detectedConflicts.push({
        conflictType: 'INSUFFICIENT_CAPACITY',
        title: `Insufficient Venue Capacity: ${exam.subject}`,
        description: `Total available venue capacity (${totalAvailableCapacity} seats) is less than the required ${matchingStudents.length} students for ${exam.subject}.`,
        severity: 'High',
        examId: exam._id,
        details: {
          requiredSeats: matchingStudents.length,
          availableSeats: totalAvailableCapacity,
        },
        suggestedSolution: 'Add new venues or mark existing unavailable venues as active to increase total capacity.',
      });
    }

    // Check if seating is generated but no invigilation is assigned (Missing Invigilation)
    const examSeatings = seatings.filter((s) => s.examId && s.examId._id.toString() === exam._id.toString());
    const examInvigilations = invigilations.filter((i) => i.examId && i.examId._id.toString() === exam._id.toString());

    if (examSeatings.length > 0) {
      const distinctVenueIds = [...new Set(examSeatings.map((s) => s.venueId?._id?.toString() || s.venueId?.toString()))];
      const assignedVenueIds = new Set(examInvigilations.map((i) => i.venueId?._id?.toString() || i.venueId?.toString()));

      const unassignedVenues = distinctVenueIds.filter((vId) => !assignedVenueIds.has(vId));

      if (unassignedVenues.length > 0) {
        detectedConflicts.push({
          conflictType: 'MISSING_INVIGILATION',
          title: `Missing Invigilator Duty: ${exam.subject}`,
          description: `Seating has been allocated for ${exam.subject} across ${distinctVenueIds.length} venue(s), but ${unassignedVenues.length} venue(s) have no invigilator assigned.`,
          severity: 'High',
          examId: exam._id,
          details: {
            unassignedVenueCount: unassignedVenues.length,
            totalVenues: distinctVenueIds.length,
          },
          suggestedSolution: 'Click "Generate Invigilation" for this exam or assign faculty members manually.',
        });
      }

      if (distinctVenueIds.length > availableFacultyCount) {
        detectedConflicts.push({
          conflictType: 'INSUFFICIENT_FACULTY',
          title: `Insufficient Available Faculty: ${exam.subject}`,
          description: `Exam ${exam.subject} requires ${distinctVenueIds.length} invigilators for allocated venues, but only ${availableFacultyCount} active faculty members exist.`,
          severity: 'High',
          examId: exam._id,
          details: {
            requiredFaculty: distinctVenueIds.length,
            availableFaculty: availableFacultyCount,
          },
          suggestedSolution: 'Add more faculty members or set faculty availability to active.',
        });
      }
    }
  }

  // 2. Check Student Overlap / Same Exam Timetable Conflict for the Same Student Group
  for (let i = 0; i < exams.length; i++) {
    for (let j = i + 1; j < exams.length; j++) {
      const examA = exams[i];
      const examB = exams[j];

      if (
        examA.department === examB.department &&
        Number(examA.year) === Number(examB.year) &&
        examA.section === examB.section
      ) {
        if (isTimeOverlap(examA.examDate, examA.startTime, examA.endTime, examB.examDate, examB.startTime, examB.endTime)) {
          detectedConflicts.push({
            conflictType: 'EXAM_TIMETABLE',
            title: `Exam Timetable Clashing: ${examA.subject} vs ${examB.subject}`,
            description: `Students in ${examA.department} Year ${examA.year} Sec ${examA.section} are scheduled for two overlapping exams: "${examA.subject}" and "${examB.subject}" on ${new Date(examA.examDate).toLocaleDateString()}.`,
            severity: 'High',
            examId: examA._id,
            details: {
              exam1: examA.subject,
              exam2: examB.subject,
              date: new Date(examA.examDate).toLocaleDateString(),
              time1: `${examA.startTime} - ${examA.endTime}`,
              time2: `${examB.startTime} - ${examB.endTime}`,
            },
            suggestedSolution: 'Reschedule one of the examinations to a different date or non-overlapping time slot.',
          });
        }
      }
    }
  }

  // 3. Check Faculty Timetable Conflicts (Faculty assigned to overlapping exams/venues)
  for (let i = 0; i < invigilations.length; i++) {
    for (let j = i + 1; j < invigilations.length; j++) {
      const invA = invigilations[i];
      const invB = invigilations[j];

      const facultyAId = invA.facultyId?._id?.toString() || invA.facultyId?.toString();
      const facultyBId = invB.facultyId?._id?.toString() || invB.facultyId?.toString();

      if (facultyAId && facultyBId && facultyAId === facultyBId) {
        const dateA = invA.examDate || invA.examId?.examDate;
        const dateB = invB.examDate || invB.examId?.examDate;
        const startA = invA.startTime || invA.examId?.startTime;
        const endA = invA.endTime || invA.examId?.endTime;
        const startB = invB.startTime || invB.examId?.startTime;
        const endB = invB.endTime || invB.examId?.endTime;

        if (isTimeOverlap(dateA, startA, endA, dateB, startB, endB)) {
          detectedConflicts.push({
            conflictType: 'FACULTY_TIMETABLE',
            title: `Faculty Duty Overlap: ${invA.facultyName}`,
            description: `Faculty member ${invA.facultyName} (${invA.facultyCode}) is assigned to multiple overlapping duties: Room ${invA.roomNumber} (${invA.examId?.subject || 'Exam 1'}) and Room ${invB.roomNumber} (${invB.examId?.subject || 'Exam 2'}).`,
            severity: 'High',
            facultyId: invA.facultyId?._id || invA.facultyId,
            examId: invA.examId?._id || invA.examId,
            details: {
              facultyName: invA.facultyName,
              facultyCode: invA.facultyCode,
              venue1: invA.roomNumber,
              venue2: invB.roomNumber,
              date: new Date(dateA).toLocaleDateString(),
              time1: `${startA} - ${endA}`,
              time2: `${startB} - ${endB}`,
            },
            suggestedSolution: 'Re-assign one of the duties to another available faculty member.',
          });
        }
      }
    }
  }

  // 4. Check Venue Timetable Conflicts (Same venue used by overlapping exams)
  // Gather all venue usage from seatings / invigilations
  const venueUsageMap = [];
  const processedVenueExamPairs = new Set();

  for (const s of seatings) {
    const vId = s.venueId?._id?.toString() || s.venueId?.toString();
    const eId = s.examId?._id?.toString() || s.examId?.toString();
    const key = `${vId}_${eId}`;
    if (!processedVenueExamPairs.has(key) && s.examId && s.venueId) {
      processedVenueExamPairs.add(key);
      venueUsageMap.push({
        venueId: s.venueId,
        examId: s.examId,
        roomNumber: s.roomNumber,
        subject: s.examId.subject,
        examDate: s.examId.examDate,
        startTime: s.examId.startTime,
        endTime: s.examId.endTime,
      });
    }
  }

  for (let i = 0; i < venueUsageMap.length; i++) {
    for (let j = i + 1; j < venueUsageMap.length; j++) {
      const uA = venueUsageMap[i];
      const uB = venueUsageMap[j];

      const vAId = uA.venueId?._id?.toString() || uA.venueId?.toString();
      const vBId = uB.venueId?._id?.toString() || uB.venueId?.toString();

      if (vAId === vBId) {
        if (isTimeOverlap(uA.examDate, uA.startTime, uA.endTime, uB.examDate, uB.startTime, uB.endTime)) {
          detectedConflicts.push({
            conflictType: 'VENUE_TIMETABLE',
            title: `Venue Timetable Conflict: Room ${uA.roomNumber}`,
            description: `Room ${uA.roomNumber} is allocated to multiple overlapping examinations: "${uA.subject}" and "${uB.subject}" on ${new Date(uA.examDate).toLocaleDateString()} (${uA.startTime} - ${uA.endTime}).`,
            severity: 'High',
            venueId: uA.venueId?._id || uA.venueId,
            examId: uA.examId?._id || uA.examId,
            details: {
              roomNumber: uA.roomNumber,
              exam1: uA.subject,
              exam2: uB.subject,
              date: new Date(uA.examDate).toLocaleDateString(),
            },
            suggestedSolution: 'Allocate a different venue or adjust exam timings so rooms are not double-booked.',
          });
        }
      }
    }
  }

  // 5. Check Assigned Faculty or Venues that are marked UNAVAILABLE
  for (const inv of invigilations) {
    if (inv.facultyId && inv.facultyId.availability === false) {
      detectedConflicts.push({
        conflictType: 'UNAVAILABLE_FACULTY',
        title: `Unavailable Faculty Assigned: ${inv.facultyName}`,
        description: `Faculty ${inv.facultyName} is currently marked as "Unavailable" but has an active duty in Room ${inv.roomNumber} for ${inv.examId?.subject || 'Exam'}.`,
        severity: 'Medium',
        facultyId: inv.facultyId._id,
        examId: inv.examId?._id,
        details: {
          facultyName: inv.facultyName,
          facultyCode: inv.facultyCode,
          roomNumber: inv.roomNumber,
        },
        suggestedSolution: 'Replace with an available faculty member or toggle faculty availability to Active.',
      });
    }
  }

  for (const s of seatings) {
    if (s.venueId && s.venueId.availability === false) {
      detectedConflicts.push({
        conflictType: 'UNAVAILABLE_VENUE',
        title: `Unavailable Venue In Use: Room ${s.roomNumber}`,
        description: `Room ${s.roomNumber} is currently marked as "Unavailable" but contains seating allocations for ${s.examId?.subject || 'Exam'}.`,
        severity: 'Medium',
        venueId: s.venueId._id,
        examId: s.examId?._id,
        details: {
          roomNumber: s.roomNumber,
        },
        suggestedSolution: 'Regenerate seating using active venues or toggle venue status to Active.',
      });
      break; // Only 1 conflict per venue needed
    }
  }

  // Save / Sync with Conflict Collection
  await Conflict.deleteMany({ status: { $ne: 'Acknowledged' } });
  if (detectedConflicts.length > 0) {
    await Conflict.insertMany(detectedConflicts);
  }

  return await Conflict.find().sort({ createdAt: -1 });
};

module.exports = {
  parseTimeToMinutes,
  isTimeOverlap,
  runConflictScan,
};
