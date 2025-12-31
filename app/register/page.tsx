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

export default function UserRegisterPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [otp, setOtp] = useState('');
  const [tempUserId, setTempUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/user/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          email: email || undefined,
          first_name: firstName,
          last_name: lastName,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTempUserId(data.tempUserId);
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

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/user/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          otp,
          tempUserId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Registration successful! Redirecting...');
        await refreshUser();
        setTimeout(() => {
          router.push('/');
        }, 1500);
      } else {
        toast.error(data.message || 'OTP verification failed');
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
        title="Register"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Register" },
        ]}
        backgroundImage="/images/login-bg.jpg"
      />
      <AuthLayout
        title="Create Account"
        subtitle="Join eCard Shop to get started"
        gradient="green"
      >
        <ProgressSteps steps={2} currentStep={step} colorScheme="green" />

        <div className="mt-8">
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <Input
                id="phone"
                type="tel"
                label="Phone Number *"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+919876543210"
                helperText="Format: +91 followed by 10 digits"
                colorScheme="green"
                required
              />

              <Input
                id="firstName"
                type="text"
                label="First Name *"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                colorScheme="green"
                required
              />

              <Input
                id="lastName"
                type="text"
                label="Last Name *"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                colorScheme="green"
                required
              />

              <Input
                id="email"
                type="email"
                label="Email Address (Optional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                colorScheme="green"
              />

              <LoadingButton
                type="submit"
                loading={loading}
                loadingText="Sending OTP..."
                colorScheme="green"
              >
                Send OTP
              </LoadingButton>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-gray-700">
                  We sent an OTP to <strong>{phone}</strong>
                </p>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-sm text-green-600 hover:text-green-700 mt-2"
                >
                  Change phone number
                </button>
              </div>

              <OtpInput
                value={otp}
                onChange={setOtp}
                colorScheme="green"
              />

              <LoadingButton
                type="submit"
                loading={loading}
                loadingText="Verifying..."
                colorScheme="green"
                disabled={otp.length !== 6}
              >
                Complete Registration
              </LoadingButton>

              <button
                type="button"
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full text-green-600 hover:text-green-700 text-sm font-medium"
              >
                Didn't receive OTP? Resend
              </button>
            </form>
          )}

          {/* Footer */}
          <div className="mt-6 text-center border-t pt-6">
            <p className="text-gray-600 text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-green-600 hover:text-green-700 font-medium">
                Login here
              </Link>
            </p>
          </div>
        </div>
      </AuthLayout>
    </div>
  );
}
