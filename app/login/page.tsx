'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { AuthLayout } from '@/components/auth/auth-layout';
import { Input } from '@/components/ui/input';
import { OtpInput } from '@/components/ui/otp-input';
import { LoadingButton } from '@/components/ui/loading-button';
import { ProgressSteps } from '@/components/ui/progress-steps';
import PageHeader from '@/components/layout/PageHeader';

export default function UserLoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/mobiletlogin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (data.success) {
        setUserId(data.id);
        toast.success('OTP sent to your phone!');
        setStep(2);
      } else {
        toast.error(data.message || 'Failed to send OTP');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/mobiletlogin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ otp, id: userId }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Login successful!');
        await refreshUser();
        router.push('/');
      } else {
        toast.error(data.message || 'Invalid OTP');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Login"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Login" },
        ]}
        backgroundImage="/images/login-bg.jpg"
      />
      <AuthLayout
        title="User Login"
        subtitle="Login using your mobile number"
        gradient="green"
      >
        <ProgressSteps steps={2} currentStep={step} />
        {step === 1 && (
          <form onSubmit={handleRequestOTP} className="space-y-5">
            <Input
              id="phone"
              type="tel"
              label="Mobile Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <LoadingButton type="submit" loading={loading} className="w-full">
              Request OTP
            </LoadingButton>
          </form>
        )}
        {step === 2 && (
          <form onSubmit={handleVerifyOTP} className="space-y-5">
            <OtpInput value={otp} onChange={setOtp} />
            <LoadingButton type="submit" loading={loading} className="w-full">
              Verify OTP
            </LoadingButton>
          </form>
        )}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            Register
          </Link>
        </p>
      </AuthLayout>
    </div>
  );
}