'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  username: string;
  email: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    console.log('Checking localStorage for existing session');
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    console.log('Token exists:', !!token);
    console.log('Saved user exists:', !!savedUser);

    if (token && savedUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(savedUser));
      console.log('Session restored');
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    console.log('Login attempt for:', username);

    try {
      const response = await authApi.login(username, password);

      console.log('Login response:', response.data);

      const { accessToken, ...userData } = response.data.data;

      console.log('Extracted token:', accessToken);
      console.log('Extracted user data:', userData);

      localStorage.setItem('token', accessToken);
      localStorage.setItem('user', JSON.stringify(userData));

      console.log('Token saved to localStorage');
      console.log('User data saved to localStorage');

      setUser(userData);
      setIsAuthenticated(true);

      console.log('Auth state updated, redirecting to dashboard');
      router.push('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (username: string, email: string, password: string) => {
    console.log('Register attempt for:', username);

    try {
      const response = await authApi.register(username, email, password);

      console.log('Register response:', response.data);

      const { accessToken, ...userData } = response.data.data;

      console.log('Extracted token:', accessToken);
      console.log('Extracted user data:', userData);

      localStorage.setItem('token', accessToken);
      localStorage.setItem('user', JSON.stringify(userData));

      console.log('Token saved to localStorage');
      console.log('User data saved to localStorage');

      setUser(userData);
      setIsAuthenticated(true);

      console.log('Auth state updated, redirecting to dashboard');
      router.push('/dashboard');
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  };

  const logout = () => {
    console.log('Logout initiated');

    localStorage.removeItem('token');
    localStorage.removeItem('user');

    console.log('Cleared localStorage');

    setUser(null);
    setIsAuthenticated(false);

    console.log('Auth state cleared, redirecting to login');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
