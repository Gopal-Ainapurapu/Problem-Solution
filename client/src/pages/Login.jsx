
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import ResendOtpButton from '../components/ResendOtpButton';

export default function Login() {
  const navigate = useNavigate();
  const { login, verifyLogin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [channel, setChannel] = useState('email');
  const [code, setCode] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await login(email.trim(), password, channel);

      if (response?.requiresOtp) {
        setOtpStep(true);
        toast.success('Verification code requested.');
      } else {
        toast.error('Unexpected login response. Please try again.');
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Unable to log in.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();

    if (!/^\d{6}$/.test(code.trim())) {
      toast.error('Enter the 6-digit verification code.');
      return;
    }

    setLoading(true);

    try {
      await verifyLogin(email.trim(), code.trim(), channel);
      toast.success('Login successful.');
      navigate('/');
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Verification failed.'
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
            LocalLens
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {otpStep
              ? 'Verify your identity to continue'
              : 'Sign in to your account'}
          </p>
        </div>

        {!otpStep ? (
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Email address
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                placeholder="Enter your password"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Receive verification code by
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

            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-sm font-semibold text-teal-700 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-teal-700 px-4 py-3 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {loading ? 'Please wait...' : 'Continue'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-5">
            <p className="text-sm text-slate-600">
              Enter the 6-digit code sent through{' '}
              <strong>{channel === 'email' ? 'email' : 'SMS'}</strong>.
            </p>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Verification code
              </label>
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
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-teal-700 px-4 py-3 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {loading ? 'Verifying...' : 'Verify and log in'}
            </button>

            <ResendOtpButton
              email={email}
              channel={channel}
              purpose="login"
            />

            <button
              type="button"
              onClick={() => {
                setOtpStep(false);
                setCode('');
              }}
              className="w-full text-sm text-slate-500 hover:text-slate-800"
            >
              Back to login
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-600">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="font-semibold text-teal-700 hover:underline"
          >
            Register
          </Link>
        </p>
      </section>
    </main>
  );
}
