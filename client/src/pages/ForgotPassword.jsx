import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const passwordRules = [
    {
      id: 'length',
      label: 'Minimum 8 characters',
      example: 'Local123',
      valid: newPassword.length >= 8,
    },
    {
      id: 'upper',
      label: 'At least one uppercase letter',
      example: 'L',
      valid: /[A-Z]/.test(newPassword),
    },
    {
      id: 'lower',
      label: 'At least one lowercase letter',
      example: 'ocal',
      valid: /[a-z]/.test(newPassword),
    },
    {
      id: 'number',
      label: 'At least one number',
      example: '123',
      valid: /\d/.test(newPassword),
    },
    {
      id: 'special',
      label: 'At least one special character',
      example: '@, #, !',
      valid: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(newPassword),
    },
  ];

  const allRulesPassed = passwordRules.every((r) => r.valid);

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !newPassword || !confirmPassword) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    if (!allRulesPassed) {
      const firstMissing = passwordRules.find((r) => !r.valid);
      setErrorMsg(
        `Password requirement not met: ${firstMissing.label} (e.g. ${firstMissing.example})`
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match. Please verify.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/forgot-password', {
        email: email.trim(),
        newPassword,
      });

      toast.success(
        response.data?.message || 'Password reset successful! Please sign in.'
      );
      navigate('/login');
    } catch (error) {
      const message =
        error.response?.data?.message ||
        'Unable to reset password. Please check your email and try again.';
      setErrorMsg(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-label="Direct Password Reset">
        <header className="auth-header">
          <div className="auth-brand-badge">
            <span aria-hidden="true">🔒</span> Account Recovery
          </div>
          <h1>Reset Your Password</h1>
          <p>
            Enter your registered account email and choose a strong new password to regain access immediately.
          </p>
        </header>

        {errorMsg && (
          <div className="alert alert-error" role="alert">
            <span aria-hidden="true">⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleResetPassword} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="reset-email">Registered Email Address</label>
            <input
              id="reset-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={loading}
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="reset-new-password">New Password</label>
            <div className="input-password-wrapper">
              <input
                id="reset-new-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                disabled={loading}
                className="form-control"
                style={{ paddingRight: '70px' }}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            {/* Password Validation Rules Helper */}
            <div
              style={{
                marginTop: '10px',
                padding: '10px 12px',
                borderRadius: '8px',
                background: 'var(--color-surface, #ffffff)',
                border: '1px solid var(--color-border, #E4E6DF)',
                fontSize: '12px',
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  color: 'var(--color-navy, #202824)',
                  marginBottom: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>Password Requirements:</span>
                <span
                  style={{
                    color: allRulesPassed ? 'var(--color-success, #287A52)' : 'var(--color-muted, #69736D)',
                    fontWeight: 700,
                  }}
                >
                  {passwordRules.filter((r) => r.valid).length} of 5 satisfied
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '4px 10px',
                }}
              >
                {passwordRules.map((rule) => (
                  <div
                    key={rule.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: rule.valid ? 'var(--color-success, #287A52)' : 'var(--color-secondary, #69736D)',
                      fontWeight: rule.valid ? 600 : 400,
                    }}
                  >
                    <span style={{ fontSize: '13px' }}>{rule.valid ? '✓' : '○'}</span>
                    <span>
                      {rule.label} <code style={{ fontSize: '11px', opacity: 0.85 }}>({rule.example})</code>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reset-confirm-password">Confirm New Password</label>
            <input
              id="reset-confirm-password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your new password"
              disabled={loading}
              className="form-control"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="auth-submit btn-primary"
            style={{ width: '100%', marginTop: '6px' }}
          >
            {loading ? 'Updating Password...' : 'Reset Password & Sign In →'}
          </button>
        </form>

        <footer className="auth-footer">
          Remembered your password? <Link to="/login">Back to Sign In</Link>
        </footer>
      </section>
    </main>
  );
}
