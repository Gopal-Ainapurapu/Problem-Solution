
import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api';
import ResendOtpButton from '../components/ResendOtpButton';

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [channel, setChannel] = useState('email');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const requestCode = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/auth/forgot-password', {
        email: email.trim(),
        channel,
      });

      toast.success(
        response.data?.message ||
          'If eligible, a recovery code will be sent.'
      );
      setStep(2);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Unable to request a recovery code.'
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (event) => {
    event.preventDefault();

    if (!/^\d{6}$/.test(code.trim())) {
      toast.error('Enter the 6-digit verification code.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/verify-reset-otp', {
        email: email.trim(),
        channel,
        code: code.trim(),
      });

      if (!response.data?.resetToken) {
        throw new Error('The server did not return a reset token.');
      }

      setResetToken(response.data.resetToken);
      setStep(3);
      toast.success('Code verified. Set your new password.');
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          'Unable to verify the recovery code.'
      );
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();

    if (newPassword.length < 8 || newPassword.length > 72) {
      toast.error('Password must be between 8 and 72 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/reset-password', {
        email: email.trim(),
        channel,
        resetToken,
        newPassword,
      });

      toast.success('Password changed. You can now log in.');
      window.location.assign('/login');
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Unable to reset your password.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900">
            Reset password
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {step === 1 && 'Request a recovery code'}
            {step === 2 && 'Verify your recovery code'}
            {step === 3 && 'Choose a new password'}
          </p>
        </div>

        {step === 1 && (
          <form onSubmit={requestCode} className="space-y-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Email address associated with your account
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-teal-600"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Receive recovery code by
              </label>
              <select
                value={channel}
                onChange={(event) => setChannel(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-teal-600"
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-teal-700 px-4 py-3 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {loading ? 'Requesting...' : 'Send recovery code'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={verifyCode} className="space-y-5">
            <p className="text-sm text-slate-600">
              Enter the 6-digit recovery code sent through{' '}
              <strong>{channel === 'email' ? 'email' : 'SMS'}</strong>.
            </p>

            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
              }
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-center text-xl tracking-[0.4em] outline-none focus:border-teal-600"
              placeholder="000000"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-teal-700 px-4 py-3 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {loading ? 'Verifying...' : 'Verify code'}
            </button>

            <ResendOtpButton
              email={email}
              channel={channel}
              purpose="password-reset"
            />

            <button
              type="button"
              onClick={() => {
                setStep(1);
                setCode('');
              }}
              className="w-full text-sm text-slate-500 hover:text-slate-800"
            >
              Back
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={resetPassword} className="space-y-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                New password
              </label>
              <input
                type="password"
                required
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-teal-600"
                placeholder="Enter a new password"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Confirm new password
              </label>
              <input
                type="password"
                required
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-teal-600"
                placeholder="Re-enter your new password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-teal-700 px-4 py-3 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {loading ? 'Updating password...' : 'Reset password'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-600">
          Remember your password?{' '}
          <Link
            to="/login"
            className="font-semibold text-teal-700 hover:underline"
          >
            Back to login
          </Link>
        </p>
      </section>
    </main>
  );
}
