import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'citizen',
    phone: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setErrorMsg('');

    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    if (form.password.length < 8 || form.password.length > 72) {
      setErrorMsg('Password must be between 8 and 72 characters.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      };

      if (form.phone.trim()) {
        payload.phone = form.phone.trim();
      }

      const response = await register(payload);

      toast.success('Account created successfully!');

      const userRole = response?.user?.role || form.role;
      if (userRole === 'volunteer') {
        navigate('/volunteer');
      } else {
        navigate('/citizen');
      }
    } catch (error) {
      const message =
        error.response?.data?.message ||
        'Registration could not be completed. Please try again.';
      setErrorMsg(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card" style={{ maxWidth: '520px' }} aria-label="Join LocalLens">
        <header className="auth-header">
          <div className="auth-brand-badge">
            <span aria-hidden="true">◎</span> LocalLens Community
          </div>
          <h1>Create Your Account</h1>
          <p>
            Join your local civic network to report neighborhood issues, track resolutions, or volunteer.
          </p>
        </header>

        {errorMsg && (
          <div className="alert alert-error" role="alert">
            <span aria-hidden="true">⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="auth-form" noValidate>
          <div className="form-group">
            <label htmlFor="reg-name">Full Name</label>
            <input
              id="reg-name"
              name="name"
              type="text"
              required
              minLength={2}
              autoComplete="name"
              value={form.name}
              onChange={handleChange}
              disabled={loading}
              placeholder="e.g. Eleanor Vance"
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-email">Email Address</label>
            <input
              id="reg-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              disabled={loading}
              placeholder="you@example.com"
              className="form-control"
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '14px',
            }}
          >
            <div className="form-group">
              <label htmlFor="reg-role">Role</label>
              <select
                id="reg-role"
                name="role"
                value={form.role}
                onChange={handleChange}
                disabled={loading}
                className="form-control"
              >
                <option value="citizen">Citizen (Report & Track)</option>
                <option value="volunteer">Volunteer (Assist & Resolve)</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="reg-phone">Phone Number (Optional)</label>
              <input
                id="reg-phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                disabled={loading}
                placeholder="+919876543210"
                className="form-control"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reg-password">Password</label>
            <div className="input-password-wrapper">
              <input
                id="reg-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                maxLength={72}
                autoComplete="new-password"
                value={form.password}
                onChange={handleChange}
                disabled={loading}
                placeholder="At least 8 characters"
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

          <div className="form-group">
            <label htmlFor="reg-confirm-password">Confirm Password</label>
            <input
              id="reg-confirm-password"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={handleChange}
              disabled={loading}
              placeholder="Re-enter your password"
              className="form-control"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="auth-submit btn-primary"
            style={{ width: '100%', marginTop: '6px' }}
          >
            {loading ? 'Creating account...' : 'Create Account →'}
          </button>
        </form>

        <footer className="auth-footer">
          Already registered? <Link to="/login">Sign in here</Link>
        </footer>
      </section>
    </main>
  );
}
