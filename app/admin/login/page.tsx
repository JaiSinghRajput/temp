'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Input } from '@/components/ui/input';
import { LoadingButton } from '@/components/ui/loading-button';

export default function AdminLoginPage() {
  const router = useRouter();
  const { refreshUser, user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already authenticated as admin
  useEffect(() => {
    if (!loading && user && (user.role === 'admin' || user.role === 'super_admin')) {
      router.push('/admin');
    }
  }, [loading, user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/adminslogin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Login successful!');
        await refreshUser();
        router.push('/admin');
      } else {
        toast.error(data.message || 'Login failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <AuthLayout
      title="Admin Portal"
      subtitle="Sign in to your admin account"
      gradient="blue"
    >
      <form onSubmit={handleLogin} className="space-y-5">
        <Input
          id="email"
          type="email"
          label="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@example.com"
          colorScheme="blue"
          required
        />

        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            colorScheme="blue"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-9.5 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? '👁️' : '👁️‍🗨️'}
          </button>
        </div>

        <LoadingButton
          type="submit"
          loading={isSubmitting}
          loadingText="Logging in..."
          colorScheme="blue"
        >
          Login
        </LoadingButton>
      </form>

      <div className="mt-6 text-center border-t pt-6">
        <Link href="/login" className="text-sm text-blue-600 hover:text-blue-700">
          ← Back to User Login
        </Link>
      </div>
    </AuthLayout>
  );
}
