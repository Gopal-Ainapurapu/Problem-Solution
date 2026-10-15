
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user, logout } = useAuth();

  const dashboardLinks = {
    citizen: {
      path: '/citizen',
      label: 'My Citizen Dashboard',
    },
    volunteer: {
      path: '/volunteer',
      label: 'Volunteer Dashboard',
    },
    admin: {
      path: '/admin',
      label: 'Admin Dashboard',
    },
  };

  const dashboard = user ? dashboardLinks[user.role] : null;

  return (
    <div
      style={{
        maxWidth: 600,
        margin: '60px auto',
        padding: 24,
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <h1>LocalLens</h1>
      <p>Report local issues. Track progress. Improve your community.</p>

      {user ? (
        <section
          style={{
            marginTop: 28,
            padding: 24,
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            background: '#fff',
          }}
        >
          <h2>Welcome, {user.name}!</h2>

          <p>
            Signed in as <strong>{user.role}</strong>
          </p>

          {dashboard && (
            <p>
              <Link
                to={dashboard.path}
                style={{
                  display: 'inline-block',
                  marginTop: 12,
                  padding: '12px 18px',
                  borderRadius: 8,
                  background: '#3563e9',
                  color: '#fff',
                  textDecoration: 'none',
                  fontWeight: 600,
                }}
              >
                {dashboard.label} →
              </Link>
            </p>
          )}

          <p>
            <Link to="/profile">👤 My Profile</Link>
          </p>

          <p>
            <Link to="/reports">Browse Community Reports</Link>
          </p>

          <p>
            <Link to="/reports/new">+ Create a Report</Link>
          </p>
          <p>
  <Link to="/notifications">🔔 Notifications</Link>
</p>

          <button
            onClick={logout}
            style={{
              marginTop: 12,
              padding: '10px 16px',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            Log out
          </button>
        </section>
      ) : (
        <section style={{ marginTop: 28 }}>
          <p>Join your community to report and track local issues.</p>

          <p>
            <Link to="/login">Log in</Link>
            {' or '}
            <Link to="/register">Register</Link>
          </p>

          <p>
            <Link to="/reports">Browse Community Reports</Link>
          </p>
        </section>
      )}
    </div>
  );
}
