/**
 * API utility functions
 * 
 * Handles HTTP requests with JWT token
 * Includes error handling and response parsing
 */

const API_URL = import.meta.env.VITE_API_URL;

/**
 * Get JWT token from localStorage
 * @returns {string|null} JWT token or null
 */
export const getToken = () => {
  return localStorage.getItem('token');
};

/**
 * Make authenticated API request
 * Automatically includes JWT token in Authorization header
 * 
 * @param {string} endpoint - API endpoint (e.g., '/api/content')
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {object} body - Request body (optional)
 * @returns {Promise<object>} Response data
 * @throws {Error} If request fails or token is missing
 */
export const apiCall = async (endpoint, method = 'GET', body = null) => {
  const token = getToken();

  if (!token && method !== 'GET') {
    throw new Error('No token found. User must be authenticated.');
  }

  const headers = {
    'Content-Type': 'application/json',
  };

  // Add Authorization header if token exists
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, options);

    // Handle 401 Unauthorized (token expired or invalid)
    if (response.status === 401) {
      // Clear token and redirect to login would happen in App.jsx
      localStorage.removeItem('token');
      throw new Error('Unauthorized. Please login again.');
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error(`API Error [${method} ${endpoint}]:`, err.message);
    throw err;
  }
};

/**
 * Public API call (no authentication required)
 * @param {string} endpoint - API endpoint
 * @param {string} method - HTTP method
 * @param {object} body - Request body (optional)
 * @returns {Promise<object>} Response data
 */
export const publicApiCall = async (endpoint, method = 'GET', body = null) => {
  const headers = {
    'Content-Type': 'application/json',
  };

  const options = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, options);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error(`API Error [${method} ${endpoint}]:`, err.message);
    throw err;
  }
};