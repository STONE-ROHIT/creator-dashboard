import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('cd_token') || null);
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('cd_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Persist auth state
  const saveAuth = useCallback((newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    if (newToken) {
      localStorage.setItem('cd_token', newToken);
      localStorage.setItem('cd_user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('cd_token');
      localStorage.removeItem('cd_user');
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.login(email, password);
    saveAuth(data.token, data.user);
    return data;
  }, [saveAuth]);

  const register = useCallback(async (email, username, password, passwordConfirm) => {
    return api.register(email, username, password, passwordConfirm);
  }, []);

  // CRITICAL: Returns new token with role='creator'. Must be stored immediately.
  const becomeCreator = useCallback(async (displayName) => {
    const data = await api.becomeCreator(displayName, token);
    // Backend issues a NEW JWT with role='creator' — we must use it
    const updatedUser = { ...user, role: 'creator' };
    saveAuth(data.token, updatedUser);
    return data;
  }, [token, user, saveAuth]);

  const logout = useCallback(() => {
    saveAuth(null, null);
  }, [saveAuth]);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token,
        isCreator: user?.role === 'creator',
        login,
        register,
        becomeCreator,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
