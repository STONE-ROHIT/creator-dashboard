import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute Component
 * 
 * Wraps routes that require authentication
 * 
 * If user is not authenticated:
 * - Redirect to /login
 * 
 * If user is authenticated:
 * - Render the component
 * 
 * Usage:
 * <ProtectedRoute component={<DashboardPage />} />
 */
export const ProtectedRoute = ({ component }) => {
  const { isAuthenticated, isLoading } = useAuth();

  // While checking auth state, show loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated, render component
  return component;
};