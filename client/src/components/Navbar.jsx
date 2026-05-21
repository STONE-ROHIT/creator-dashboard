import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Navbar Component
 * 
 * Shows:
 * - If authenticated: user name + logout button
 * - If not authenticated: login/register links
 */
export const Navbar = () => {
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        {/* Logo/Brand */}
        <Link to="/" className="text-xl font-bold text-primary">
          Creator Dashboard
        </Link>

        {/* Navigation */}
        <div className="flex gap-6 items-center">
          {isAuthenticated ? (
            <>
              {/* User Info */}
              <span className="text-gray-700">
                Welcome, <span className="font-semibold">{user?.role}</span>
              </span>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-danger text-white rounded-lg hover:bg-red-600 transition"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              {/* Login Link */}
              <Link
                to="/login"
                className="text-primary hover:text-blue-700 font-medium"
              >
                Login
              </Link>

              {/* Register Link */}
              <Link
                to="/register"
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};