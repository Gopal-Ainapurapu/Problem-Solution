
import { useEffect, useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

const COOLDOWN_SECONDS = 60;

export default function ResendOtpButton({ email, channel, purpose }) {
  const [secondsLeft, setSecondsLeft] = useState(COOLDOWN_SECONDS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;

    const timer = setTimeout(() => {
      setSecondsLeft((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const resend = async () => {
    setLoading(true);

    try {
      const response = await api.post('/auth/resend-otp', {
        email: email.trim(),
        channel,
        purpose,
      });

      toast.success(
        response.data.message || 'Verification code requested.'
      );
      setSecondsLeft(COOLDOWN_SECONDS);
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Unable to resend the code.'
      );

      if (err.response?.status === 429) {
        setSecondsLeft(COOLDOWN_SECONDS);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-center">
      <button
        type="button"
        onClick={resend}
        disabled={loading || secondsLeft > 0}
        className="text-sm font-semibold text-teal-700 transition hover:text-teal-900 disabled:cursor-not-allowed disabled:text-slate-400"
      >
        {loading
          ? 'Sending code...'
          : secondsLeft > 0
            ? `Resend code in ${secondsLeft}s`
            : 'Resend verification code'}
      </button>
    </div>
  );
}
