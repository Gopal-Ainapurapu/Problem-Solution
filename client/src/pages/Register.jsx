
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import ResendOtpButton from '../components/ResendOtpButton';

export default function Register() {
  const navigate = useNavigate();
  const { register, verifyRegistration } = useAuth();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'citizen',
    phone: '',
  });

  const [channel, setChannel] = useState('email');
  const [code, setCode] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        channel,
      };

      if (channel === 'sms') {
        payload.phone = form.phone.trim();
      }

      const response = await register(payload);

      if (response?.requiresOtp) {
        setOtpStep(true);
        toast.success('Verification code requested.');
      } else {
        toast.error('Unexpected registration response. Please try again.');
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Registration failed.'
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
      await verifyRegistration(
        form.email.trim(),
        code.trim(),
        channel
      );

      toast.success('Registration completed successfully.');
      navigate('/');
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Verification failed. Check your code and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900">
            Join LocalLens
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {otpStep
              ? 'Verify your account'
              : 'Create your account to get started'}
          </p>
        </div>

        {!otpStep ? (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Full name
              </label>
              <input
                name="name"
                type="text"
                required
                minLength={2}
                autoComplete="name"
                value={form.name}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-teal-600"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Email address
              </label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-teal-600"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
                value={form.password}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-teal-600"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Account type
              </label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-teal-600"
              >
                <option value="citizen">Citizen</option>
                <option value="volunteer">Volunteer</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Verification method
              </label>
              <select
                value={channel}
                onChange={(event) => setChannel(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-teal-600"
              >
                <option value="email">Email OTP</option>
                <option value="sms">SMS OTP</option>
              </select>
            </div>

            {channel === 'sms' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Phone number
                </label>
                <input
                  name="phone"
                  type="tel"
                  required
                  value={form.phone}
                  onChange={handleChange}
                  pattern="^\+[1-9]\d{7,14}$"
                  title="Use international format, for example +919876543210"
                  className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-teal-600"
                  placeholder="+919876543210"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Include your country code, such as +91 for India.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-teal-700 px-4 py-3 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {loading ? 'Creating account...' : 'Create account'}
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
              {loading ? 'Verifying...' : 'Verify and register'}
            </button>

            <ResendOtpButton
              email={form.email}
              channel={channel}
              purpose="register"
            />

            <button
              type="button"
              onClick={() => {
                setOtpStep(false);
                setCode('');
              }}
              className="w-full text-sm text-slate-500 hover:text-slate-800"
            >
              Back to registration
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-teal-700 hover:underline"
          >
            Log in
          </Link>
        </p>
      </section>
    </main>
  );
}
