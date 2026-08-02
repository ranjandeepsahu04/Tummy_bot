'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  restaurantId?: string | null;
  restaurantName?: string | null;
}

interface AuthContextType {
  admin: AdminUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('tummy_access_token');
    const savedAdmin = localStorage.getItem('tummy_admin');

    if (savedToken && savedAdmin) {
      setToken(savedToken);
      try {
        setAdmin(JSON.parse(savedAdmin));
      } catch (e) {
        localStorage.removeItem('tummy_admin');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.post('/auth/login', { email, password: pass });
    const { accessToken, admin: adminData } = res.data.data;

    localStorage.setItem('tummy_access_token', accessToken);
    localStorage.setItem('tummy_admin', JSON.stringify(adminData));

    setToken(accessToken);
    setAdmin(adminData);
  };

  const logout = () => {
    localStorage.removeItem('tummy_access_token');
    localStorage.removeItem('tummy_admin');
    setToken(null);
    setAdmin(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ admin, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
