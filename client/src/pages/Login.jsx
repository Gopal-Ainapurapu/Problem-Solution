import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !password) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }

    setLoading(true);

    try {
      const response = await login(email.trim(), password);

      toast.success('Welcome back!');

      const userRole = response?.user?.role;
      if (userRole === 'admin') {
        navigate('/admin');
      } else if (userRole === 'volunteer') {
        navigate('/volunteer');
      } else {
        navigate('/citizen');
      }
    } catch (error) {
      const message =
        error.response?.data?.message ||
        'Invalid email or password. Please try again.';
      setErrorMsg(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-label="Sign in to LocalLens">
        <header className="auth-header">
          <div className="auth-brand-badge">
            <span aria-hidden="true">◎</span> LocalLens Civic Platform
          </div>
          <h1>Welcome Back</h1>
          <p>
            Sign in to access your civic workspace, manage tasks, and track community reports.
          </p>
        </header>

        {errorMsg && (
          <div className="alert alert-error" role="alert">
            <span aria-hidden="true">⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
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
            <div className="flex-between">
              <label htmlFor="login-password">Password</label>
              <Link
                to="/forgot-password"
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--color-primary)',
                }}
              >
                Forgot password?
              </Link>
            </div>
            <div className="input-password-wrapper">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
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
          </div>

          <button
            type="submit"
            disabled={loading}
            className="auth-submit btn-primary"
            style={{ width: '100%', marginTop: '6px' }}
          >
            {loading ? 'Signing in...' : 'Sign In to LocalLens →'}
          </button>
        </form>

        <footer className="auth-footer">
          Don&apos;t have an account yet?{' '}
          <Link to="/register">Create an account</Link>
        </footer>
      </section>
    </main>
  );
}
