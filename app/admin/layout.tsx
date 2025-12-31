"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/sidebar';
import { Box } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';

const DRAWER_WIDTH = 0;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  // Skip auth check for login page
  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (isLoginPage) {
      return;
    }

    if (!loading) {
      if (!user) {
        // Not authenticated, redirect to admin login
        router.push('/admin/login');
      } else if (user.role !== 'admin' && user.role !== 'super_admin') {
        // Not an admin, redirect to home
        router.push('/');
      }
    }
  }, [user, loading, router, isLoginPage]);

  // Show login page without auth check or sidebar
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⌛</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </Box>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <AdminSidebar />
      <Box
        component="main"
        sx={{
          flex: 1,
          marginLeft: `${DRAWER_WIDTH}px`,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
