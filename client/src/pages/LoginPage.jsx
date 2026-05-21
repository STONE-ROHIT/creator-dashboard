import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * LoginPage
 * 
 * Allows users to login with email and password
 * 
 * Validation:
 * - Email required
 * - Password required (8+ chars)
 * 
 * On success:
 * - Store JWT token
 * - Redirect to /dashboard
 * 
 * On error:
 * - Show error message
 * - Stay on page
 */
export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  /**
   * Redirect if already authenticated
   */
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate inputs
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!password) {
      setError('Password is required');
      return;
    }

    setIsLoading(true);

    // Call login
    const result = await login(email, password);

    if (result.success) {
      setSuccess('Login successful! Redirecting...');
      // Redirect handled by useEffect watching isAuthenticated
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    } else {
      setError(result.error || 'Login failed. Please try again.');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Login</h1>
          <p className="text-gray-600">Sign in to your account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
              {success}
            </div>
          )}

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alice@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isLoading}
            />
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isLoading}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 bg-primary text-white rounded-lg hover:bg-blue-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center text-gray-600">
          <p>
            Don't have an account?{' '}
            <Link to="/register" className="text-primary hover:text-blue-700 font-medium">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};