import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../services/api';

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  business_name?: string;
  plan: 'free' | 'premium';
  preferred_language: string;
  subdomain?: string;
  custom_domain?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  businessName?: string;
  preferredLanguage?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('fera_token');
    const savedUser = localStorage.getItem('fera_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { user: u, token: t } = res.data;
    setUser(u);
    setToken(t);
    localStorage.setItem('fera_token', t);
    localStorage.setItem('fera_user', JSON.stringify(u));
  };

  const register = async (data: RegisterData) => {
    const res = await api.post('/auth/register', data);
    const { user: u, token: t } = res.data;
    setUser(u);
    setToken(t);
    localStorage.setItem('fera_token', t);
    localStorage.setItem('fera_user', JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('fera_token');
    localStorage.removeItem('fera_user');
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updated = { ...user, ...updates };
      setUser(updated);
      localStorage.setItem('fera_user', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
