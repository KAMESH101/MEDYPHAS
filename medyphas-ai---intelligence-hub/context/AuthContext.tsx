import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (user: User, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Read the persisted user synchronously so a page refresh doesn't bounce to /login.
  const [user, setUser] = useState<User | null>(() => {
    try {
      const storedUser = localStorage.getItem('medyphas_user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    // Remove any Gemini key saved by older versions of the app.
    localStorage.removeItem('medyphas_api_key');
  }, []);

  const login = (userData: User, token: string) => {
    setUser(userData);
    localStorage.setItem('medyphas_user', JSON.stringify(userData));
    localStorage.setItem('medyphas_token', token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('medyphas_user');
    localStorage.removeItem('medyphas_token');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};