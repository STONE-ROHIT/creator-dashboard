import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';

/**
 * AppRoutes
 * 
 * Separated from App so we can access AuthContext inside Routes
 */
const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <>
      {/* Navigation */}
      <Navbar />

      {/* Page Routes */}
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
          }
        />
        <Route
          path="/register"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />
          }
        />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={<ProtectedRoute component={<DashboardPage />} />}
        />

        {/* Root Path */}
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

/**
 * App
 * 
 * Root component with AuthProvider wrapper
 */
export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}