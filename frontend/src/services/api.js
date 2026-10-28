// Centralized API Client with standard error formatting and JWT attachment

const API_ORIGIN = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000'
)
  .replace(/\/+$/, '')
  .replace(/\/api$/i, '');

const BASE_URL = `${API_ORIGIN}/api`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async (response) => {
  let data = {};
  try {
    data = await response.json();
  } catch (err) {
    data = {};
  }

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      const errorMessage = data.message || 'Your session has expired. Please login again.';
      throw new Error(errorMessage);
    }
    if (response.status === 403) {
      throw new Error(data.message || 'Access Forbidden: You do not have permission for this action.');
    }
    if (response.status === 404) {
      throw new Error(data.message || 'The requested resource was not found.');
    }
    if (response.status === 409) {
      throw new Error(data.message || 'A duplicate record or timetable conflict exists.');
    }
    if (response.status === 400) {
      throw new Error(data.message || 'Validation error. Please check your inputs.');
    }
    throw new Error(data.message || 'Something went wrong on the server. Please try again.');
  }

  return data;
};

export const api = {
  // Generic Request Helper
  async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          ...getAuthHeaders(),
          ...options.headers,
        },
      });
      return await handleResponse(response);
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Unable to connect to the backend server. Please verify the server is running.');
      }
      throw error;
    }
  },

  // Auth APIs
  login: (credentials) =>
    api.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  getProfile: () => api.request('/auth/profile'),

  // Dashboard Stats
  getDashboardStats: () => api.request('/dashboard/stats'),

  // Students APIs
  getStudents: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.request(`/students${query ? `?${query}` : ''}`);
  },
  getStudentById: (id) => api.request(`/students/${id}`),
  createStudent: (studentData) =>
    api.request('/students', {
      method: 'POST',
      body: JSON.stringify(studentData),
    }),
  updateStudent: (id, studentData) =>
    api.request(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(studentData),
    }),
  deleteStudent: (id) =>
    api.request(`/students/${id}`, {
      method: 'DELETE',
    }),

  // Faculty APIs
  getFaculty: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.request(`/faculty${query ? `?${query}` : ''}`);
  },
  createFaculty: (facultyData) =>
    api.request('/faculty', {
      method: 'POST',
      body: JSON.stringify(facultyData),
    }),
  updateFaculty: (id, facultyData) =>
    api.request(`/faculty/${id}`, {
      method: 'PUT',
      body: JSON.stringify(facultyData),
    }),
  deleteFaculty: (id) =>
    api.request(`/faculty/${id}`, {
      method: 'DELETE',
    }),

  // Venue APIs
  getVenues: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.request(`/venues${query ? `?${query}` : ''}`);
  },
  createVenue: (venueData) =>
    api.request('/venues', {
      method: 'POST',
      body: JSON.stringify(venueData),
    }),
  updateVenue: (id, venueData) =>
    api.request(`/venues/${id}`, {
      method: 'PUT',
      body: JSON.stringify(venueData),
    }),
  deleteVenue: (id) =>
    api.request(`/venues/${id}`, {
      method: 'DELETE',
    }),

  // Exam APIs
  getExams: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.request(`/exams${query ? `?${query}` : ''}`);
  },
  getExamById: (id) => api.request(`/exams/${id}`),
  createExam: (examData) =>
    api.request('/exams', {
      method: 'POST',
      body: JSON.stringify(examData),
    }),
  updateExam: (id, examData) =>
    api.request(`/exams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(examData),
    }),
  deleteExam: (id) =>
    api.request(`/exams/${id}`, {
      method: 'DELETE',
    }),

  // Seating APIs
  generateSeating: (examId) =>
    api.request(`/seating/generate/${examId}`, {
      method: 'POST',
    }),
  getSeatingByExam: (examId) => api.request(`/seating/exam/${examId}`),
  getMySeat: () => api.request('/seating/student/my-seat'),
  clearSeating: (examId) =>
    api.request(`/seating/exam/${examId}`, {
      method: 'DELETE',
    }),

  // Invigilation APIs
  generateInvigilation: (examId) =>
    api.request(`/invigilation/generate/${examId}`, {
      method: 'POST',
    }),
  getInvigilationByExam: (examId) => api.request(`/invigilation/exam/${examId}`),
  getMyDuties: () => api.request('/invigilation/faculty/my-duties'),
  reassignDuty: (dutyId, facultyId) =>
    api.request(`/invigilation/${dutyId}`, {
      method: 'PUT',
      body: JSON.stringify({ facultyId }),
    }),
  clearInvigilation: (examId) =>
    api.request(`/invigilation/exam/${examId}`, {
      method: 'DELETE',
    }),

  // Conflict APIs
  getConflicts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.request(`/conflicts${query ? `?${query}` : ''}`);
  },
  scanConflicts: () =>
    api.request('/conflicts/scan', {
      method: 'POST',
    }),
  resolveConflict: (id, status = 'Resolved') =>
    api.request(`/conflicts/${id}/resolve`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  // PDF APIs — returns a URL to open/download
  getPdfUrl: (path) => {
    const token = localStorage.getItem('token');
    return `${BASE_URL}/pdf${path}?token=${token}`;
  },

  // Import APIs
  importPreview: (formData) => {
    const token = localStorage.getItem('token');
    return fetch(`${BASE_URL}/import/preview`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }).then(async (response) => {
      let data = {};
      try { data = await response.json(); } catch (e) { data = {}; }
      if (!response.ok) throw new Error(data.message || 'Import preview failed.');
      return data;
    });
  },
  importConfirm: (dataType, records) =>
    api.request('/import/confirm', {
      method: 'POST',
      body: JSON.stringify({ dataType, records }),
    }),

  // User Management APIs
  getUsers: () => api.request('/users'),
  getUserById: (id) => api.request(`/users/${id}`),
  createAdmin: (data) =>
    api.request('/users/create-admin', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  toggleUserStatus: (id, isActive) =>
    api.request(`/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ isActive }),
    }),
  resetUserPassword: (id, newPassword) =>
    api.request(`/users/${id}/reset-password`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword }),
    }),
  deleteUser: (id) =>
    api.request(`/users/${id}`, { method: 'DELETE' }),

  // Registration APIs
  registerStudent: (data) =>
    api.request('/users/register-student', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  registerFaculty: (data) =>
    api.request('/users/register-faculty', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};