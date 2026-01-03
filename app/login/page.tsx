'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services';
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
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const data = await authService.requestLoginOtp(phone);

    if (data.success) {
      setUserId(data.uid || null);
      toast.success('OTP sent to your phone!');
      setStep(2);
    } else {
      toast.error(data.message || 'Failed to send OTP');
    }
    setLoading(false);
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const data = await authService.verifyLoginOtp({ otp, uid: userId || '' });

    if (data.success) {
      toast.success('Login successful!');
      // Refresh user state from cookie
      await new Promise(resolve => setTimeout(resolve, 500));
      await refreshUser();
      // Navigate home - router.push handles the navigation smoothly
      setTimeout(() => {
        router.push('/');
      }, 300);
    } else {
      toast.error(data.message || 'Invalid OTP');
    }
    setLoading(false);
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