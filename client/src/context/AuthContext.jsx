import React, { createContext, useState, useEffect } from 'react';

/**
 * AuthContext
 * 
 * Global authentication state
 * 
 * Provides:
 * - token: JWT token (stored in localStorage)
 * - user: Current user object { id, role }
 * - isLoading: Loading state during auth checks
 * - login: Login function
 * - register: Register function
 * - becomeCreator: Become creator function
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
        try {
          if (storedToken.startsWith('eyJ')) {
            const base64Url = storedToken.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
              atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
            );
            
            const decoded = JSON.parse(jsonPayload);
            
            setToken(storedToken);
            setUser({
              id: decoded.id,
              role: decoded.role,
            });
          }
        } catch (err) {
          console.error('Token restoration failed:', err.message);
          localStorage.removeItem('token');
        }
      }
      
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  /**
   * Login user
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
      const newToken = data.token;

      const base64Url = newToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      const decoded = JSON.parse(jsonPayload);

      localStorage.setItem('token', newToken);
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
   * CRITICAL: Become a creator
   * Backend returns new token with creator role
   * Frontend MUST sync this token immediately
   */
  const becomeCreator = async (displayName) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/creators/become-creator`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ displayName }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to become creator');
      }

      const data = await response.json();

      // CRITICAL: Extract new token from response
      const newToken = data.token;

      // Parse new token
      const base64Url = newToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      const decoded = JSON.parse(jsonPayload);

      // CRITICAL: Update localStorage with NEW token
      localStorage.setItem('token', newToken);

      // CRITICAL: Update AuthContext with NEW role
      setToken(newToken);
      setUser({
        id: decoded.id,
        role: decoded.role,
      });

      return { success: true, creator: data.creator };
    } catch (err) {
      console.error('Become creator error:', err.message);
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
    becomeCreator,
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
 */
export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};