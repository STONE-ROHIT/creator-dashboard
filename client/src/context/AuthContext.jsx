import React, { createContext, useState, useEffect } from 'react';

/**
 * AuthContext
 * 
 * Global authentication state
 * 
 * Provides:
 * - token: JWT token (stored in localStorage)
 * - user: Current user object { id, email, username, role }
 * - isLoading: Loading state during auth checks
 * - login: Login function
 * - register: Register function
 * - logout: Logout function
 */

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Initialize auth state on component mount
   * Check localStorage for existing token
   */
  useEffect(() => {
    const initializeAuth = () => {
      const storedToken = localStorage.getItem('token');
      
      if (storedToken) {
        // Try to restore from localStorage
        try {
          // Validate token format (basic check)
          if (storedToken.startsWith('eyJ')) {
            // Parse JWT to get user info
            const base64Url = storedToken.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
              atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
            );
            
            const decoded = JSON.parse(jsonPayload);
            
            // Token restored from localStorage
            setToken(storedToken);
            setUser({
              id: decoded.id,
              role: decoded.role,
            });
          }
        } catch (err) {
          console.error('Token restoration failed:', err.message);
          // Invalid token, clear it
          localStorage.removeItem('token');
        }
      }
      
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  /**
   * Login user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<void>}
   */
  const login = async (email, password) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();

      // Extract token
      const newToken = data.token;

      // Parse JWT to get user info
      const base64Url = newToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      const decoded = JSON.parse(jsonPayload);

      // Store token in localStorage
      localStorage.setItem('token', newToken);

      // Update state
      setToken(newToken);
      setUser({
        id: decoded.id,
        role: decoded.role,
      });

      return { success: true };
    } catch (err) {
      console.error('Login error:', err.message);
      return { success: false, error: err.message };
    }
  };

  /**
   * Register user
   * @param {string} email - User email
   * @param {string} username - User username
   * @param {string} password - User password
   * @param {string} passwordConfirm - Password confirmation
   * @returns {Promise<void>}
   */
  const register = async (email, username, password, passwordConfirm) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/register`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            username,
            password,
            passwordConfirm,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      return { success: true };
    } catch (err) {
      console.error('Register error:', err.message);
      return { success: false, error: err.message };
    }
  };

  /**
   * Logout user
   */
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const value = {
    token,
    user,
    isLoading,
    login,
    register,
    logout,
    isAuthenticated: !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to use AuthContext
 * @returns {object} Auth context value
 */
export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};