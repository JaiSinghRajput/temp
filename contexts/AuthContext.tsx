"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
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

  const refreshUser = async () => {
    try {
      if (!initialized) setLoading(true);

      const data = await authService.verifyToken();

      if (data?.success && data.user) {
        setUser(data.user);
      } else {
        // Token invalid or expired
        setUser(null);
      }
    } catch (error: any) {
      setUser(null);
    } finally {
      setInitialized(true);
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
    } finally {
      setUser(null);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        setUser,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
