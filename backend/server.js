const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/faculty', require('./routes/facultyRoutes'));
app.use('/api/venues', require('./routes/venueRoutes'));
app.use('/api/exams', require('./routes/examRoutes'));
app.use('/api/seating', require('./routes/seatingRoutes'));
app.use('/api/invigilation', require('./routes/invigilationRoutes'));
app.use('/api/conflicts', require('./routes/conflictRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/pdf', require('./routes/pdfRoutes'));
app.use('/api/import', require('./routes/importRoutes'));
app.use('/api/users', require('./routes/userRoutes'));

// Root & /api health check routes
app.get(['/', '/api'], (req, res) => {
  res.json({
    success: true,
    message: 'Examination Seating and Invigilation Management System API is running smoothly.',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      students: '/api/students',
      faculty: '/api/faculty',
      venues: '/api/venues',
      exams: '/api/exams',
      seating: '/api/seating',
      invigilation: '/api/invigilation',
      conflicts: '/api/conflicts',
      dashboard: '/api/dashboard/stats',
    },
    timestamp: new Date().toISOString(),
  });
});

// Custom Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Exam Seating & Invigilation Server running on port ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(` API Endpoint: http://localhost:${PORT}/api`);
  console.log(`====================================================`);
});
