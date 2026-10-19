import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  apiKey: string;
  setApiKey: (key: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [apiKey, setApiKeyState] = useState<string>('');

  useEffect(() => {
    // Load persisted state
    const storedUser = localStorage.getItem('medyphas_user');
    const storedKey = localStorage.getItem('medyphas_api_key');

    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    if (storedKey) {
      setApiKeyState(storedKey);
    }
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

  const setApiKey = (key: string) => {
    setApiKeyState(key);
    if (key) {
      localStorage.setItem('medyphas_api_key', key);
    } else {
      localStorage.removeItem('medyphas_api_key');
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, apiKey, setApiKey }}>
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