import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * RegisterPage
 * 
 * Allows users to create a new account
 * 
 * Validation:
 * - Email required, valid format
 * - Username required, 3+ chars
 * - Password required, 8+ chars
 * - Passwords must match
 * 
 * On success:
 * - Show success message
 * - Redirect to /login after 2 seconds
 * 
 * On error:
 * - Show error message
 * - Stay on page
 */
export const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const { register, isAuthenticated } = useAuth();
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
   * Validate email format
   */
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

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

    if (!isValidEmail(email)) {
      setError('Invalid email format');
      return;
    }

    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (!password) {
      setError('Password is required');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!passwordConfirm) {
      setError('Password confirmation is required');
      return;
    }

    if (password !== passwordConfirm) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    // Call register
    const result = await register(email, username, password, passwordConfirm);

    if (result.success) {
      setSuccess('Registration successful! Redirecting to login...');
      setEmail('');
      setUsername('');
      setPassword('');
      setPasswordConfirm('');
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } else {
      setError(result.error || 'Registration failed. Please try again.');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Register</h1>
          <p className="text-gray-600">Create a new account</p>
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

          {/* Username Field */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="alice"
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
            <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
          </div>

          {/* Password Confirm Field */}
          <div>
            <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              id="passwordConfirm"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
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
            {isLoading ? 'Registering...' : 'Register'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center text-gray-600">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:text-blue-700 font-medium">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};