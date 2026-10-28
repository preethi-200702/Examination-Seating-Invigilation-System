import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import { Login } from './pages/Login';
import { RegisterPage } from './pages/RegisterPage';
import { Dashboard } from './pages/Dashboard';
import { StudentsPage } from './pages/StudentsPage';
import { FacultyPage } from './pages/FacultyPage';
import { VenuesPage } from './pages/VenuesPage';
import { ExamsPage } from './pages/ExamsPage';
import { SeatingPage } from './pages/SeatingPage';
import { InvigilationPage } from './pages/InvigilationPage';
import { ConflictsPage } from './pages/ConflictsPage';
import { FacultyDutiesPage } from './pages/FacultyDutiesPage';
import { StudentMySeatPage } from './pages/StudentMySeatPage';
import { ImportPage } from './pages/ImportPage';
import { UserManagementPage } from './pages/UserManagementPage';

const RootRedirect = () => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'student') return <Navigate to="/my-seat" replace />;
  if (user?.role === 'faculty') return <Navigate to="/faculty-duties" replace />;
  return <Navigate to="/dashboard" replace />;
};

export const App = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Authenticated Layout Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<RootRedirect />} />

              {/* Shared Dashboard */}
              <Route path="dashboard" element={<Dashboard />} />

              {/* Admin Only Routes */}
              <Route
                path="students"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <StudentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="faculty"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <FacultyPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="venues"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <VenuesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="exams"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <ExamsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="import"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <ImportPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="users"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <UserManagementPage />
                  </ProtectedRoute>
                }
              />

              {/* Seating and Invigilation (Admin & Faculty) */}
              <Route
                path="seating"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'faculty']}>
                    <SeatingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="invigilation"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <InvigilationPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="conflicts"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'faculty']}>
                    <ConflictsPage />
                  </ProtectedRoute>
                }
              />

              {/* Faculty Exclusive Route */}
              <Route
                path="faculty-duties"
                element={
                  <ProtectedRoute allowedRoles={['faculty', 'admin']}>
                    <FacultyDutiesPage />
                  </ProtectedRoute>
                }
              />

              {/* Student Exclusive Route */}
              <Route
                path="my-seat"
                element={
                  <ProtectedRoute allowedRoles={['student', 'admin']}>
                    <StudentMySeatPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
