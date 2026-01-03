"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services';

interface User {
  uid: string;
  name: string;
  email?: string;
  mobile?: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();

  const refreshUser = async () => {
    try {
      setLoading(true);
      const data = await authService.verifyToken();

      if (data.success && data.user) {
        setUser(data.user);
      } else if (data.message?.toLowerCase().includes('token')) {
        // Token invalid/expired: clear user only if we have no prior user
        setUser((prev) => (prev ? prev : null));
      } else {
        // Keep prior user on transient errors
        setUser((prev) => (initialized ? prev : null));
      }
    } catch (error: any) {
      // On verification failure keep existing user to avoid sudden logout on transient errors
      if (!initialized) setUser(null);
    } finally {
      setInitialized(true);
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      router.push('/login');
    } catch (error) {
      setUser(null);
      router.push('/login');
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setUser, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
