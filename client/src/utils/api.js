/**
 * API utility functions
 * 
 * Handles HTTP requests with JWT token
 * Includes error handling and response parsing
 */

const API_URL = import.meta.env.VITE_API_URL;

/**
 * Get JWT token from localStorage
 */
export const getToken = () => {
  return localStorage.getItem('token');
};

/**
 * Make authenticated API request
 */
export const apiCall = async (endpoint, method = 'GET', body = null) => {
  const token = getToken();

  if (!token && method !== 'GET') {
    throw new Error('No token found. User must be authenticated.');
  }

  const headers = {
    'Content-Type': 'application/json',
  };

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

    if (response.status === 401) {
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

/**
 * Format date for display
 */
export const formatDate = (isoDate) => {
  if (!isoDate) return '';
  
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (err) {
    return '';
  }
};

/**
 * UPDATED: Format currency for display
 * Handles both numbers and strings
 */
export const formatCurrency = (amount) => {
  // Handle null/undefined
  if (amount === null || amount === undefined) {
    return '₹0.00';
  }

  // Convert string to number if needed
  let num = amount;
  if (typeof amount === 'string') {
    num = parseFloat(amount);
  }

  // Validate number
  if (isNaN(num)) {
    return '₹0.00';
  }

  return `₹${num.toFixed(2)}`;
};

/**
 * Format large numbers for display
 */
export const formatNumber = (num) => {
  if (typeof num !== 'number') return '0';
  
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};