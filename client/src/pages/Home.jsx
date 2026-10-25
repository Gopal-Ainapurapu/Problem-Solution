import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';
import api from '../api';
import './Home.css';

const dashboardLinks = {
  citizen: { path: '/citizen', label: 'Citizen Dashboard' },
  volunteer: { path: '/volunteer', label: 'Volunteer Dashboard' },
  admin: { path: '/admin', label: 'Admin Console' },
};

export default function Home() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({ total: 0, resolved: 0, inProgress: 0 });
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let ignore = false;
    const fetchRealStats = async () => {
      try {
        const response = await api.get('/reports', { params: { limit: 50 } });
        const list = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.reports)
            ? response.data.reports
            : [];

        const total = response.data?.pagination?.total || list.length;
        const resolved = list.filter((r) => r.status === 'resolved').length;
        const inProgress = list.filter(
          (r) => r.status === 'in-progress' || r.status === 'assigned' || r.status === 'verified'
        ).length;

        if (!ignore) {
          setStats({ total, resolved, inProgress });
          setStatsLoaded(true);
        }
      } catch {
        if (!ignore) {
          setStatsLoaded(false);
        }
      }
    };

    fetchRealStats();
    return () => {
      ignore = true;
    };
  }, []);

  const dashboard = user ? dashboardLinks[user.role] : null;

  return (
    <div className="home-page">
      {/* Navigation Bar */}
      <header className="home-navbar">
        <div className="home-navbar-inner">
          <Link to="/" className="home-brand" aria-label="LocalLens Home">
            <span className="brand-emblem" aria-hidden="true">◎</span>
            <span>
              LocalLens<span className="brand-gold-dot">.</span>
            </span>
          </Link>

          <nav className="home-nav-links" aria-label="Main Navigation">
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <Link to="/reports">Reports Directory</Link>
            <Link to="/reports-map">Interactive Map</Link>
          </nav>

          <div className="home-nav-actions">
            {user ? (
              <>
                <NotificationBell />
                {dashboard && (
                  <Link to={dashboard.path} className="btn btn-sm btn-secondary">
                    {dashboard.label}
                  </Link>
                )}
                <Link to="/profile" className="home-user-badge" title="View Profile">
                  <span className="home-user-avatar">
                    {(user.name || 'U').charAt(0).toUpperCase()}
                  </span>
                  <span>{user.name?.split(' ')[0] || 'Profile'}</span>
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="btn btn-sm btn-outline"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="home-login-link">
                  Sign In
                </Link>
                <Link to="/register" className="btn btn-sm btn-primary">
                  Join Community →
                </Link>
              </>
            )}

            <button
              type="button"
              className="home-mobile-toggle"
              aria-label="Toggle mobile menu"
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              <span className="mobile-bar" />
              <span className="mobile-bar" />
              <span className="mobile-bar" />
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="home-mobile-drawer">
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
            <Link to="/reports" onClick={() => setMobileMenuOpen(false)}>Reports Directory</Link>
            <Link to="/reports-map" onClick={() => setMobileMenuOpen(false)}>Interactive Map</Link>
            {user ? (
              <>
                {dashboard && (
                  <Link to={dashboard.path} onClick={() => setMobileMenuOpen(false)}>
                    {dashboard.label}
                  </Link>
                )}
                <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>Profile Settings</Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="btn btn-sm btn-outline"
                  style={{ width: '100%', marginTop: '6px' }}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                <Link to="/login" className="btn btn-sm btn-outline" onClick={() => setMobileMenuOpen(false)}>
                  Sign In
                </Link>
                <Link to="/register" className="btn btn-sm btn-primary" onClick={() => setMobileMenuOpen(false)}>
                  Register
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="home-hero">
        <div className="home-hero-container">
          <div className="home-hero-copy">
            <div className="home-eyebrow">
              <span className="eyebrow-accent-dot" />
              Civic Infrastructure & Neighborhood Care
            </div>

            <h1 className="home-hero-title">
              Better Communities Start With One Report.
            </h1>

            <p className="home-hero-subtitle">
              Report local problems, connect with your community, and help turn everyday concerns into meaningful improvements.
            </p>

            <div className="home-hero-cta">
              <Link to="/reports/new" className="btn btn-lg btn-primary">
                Report an Issue →
              </Link>
              <a href="#how-it-works" className="btn btn-lg btn-outline">
                Explore How It Works
              </a>
            </div>

            <div className="home-trust-badges">
              <div className="trust-item">
                <span className="trust-check">✓</span> 100% Verified Community Audits
              </div>
              <div className="trust-item">
                <span className="trust-check">✓</span> Municipal & Volunteer Action
              </div>
              <div className="trust-item">
                <span className="trust-check">✓</span> Direct Citizen Follow-up
              </div>
            </div>
          </div>

          <div className="home-hero-visual">
            <div className="hero-preview-card">
              <div className="hero-card-header">
                <span className="status-badge status-verified">Verified Issue</span>
                <span className="hero-card-date">Ward 7, Central District</span>
              </div>
              <h3 className="hero-card-title">Damaged Pedestrian Crossing & Drainage</h3>
              <p className="hero-card-text">
                Sunken road surface creating standing stormwater near primary school entrance. Local volunteers assigned for patch inspection.
              </p>
              <div className="hero-card-meta">
                <div className="meta-tag">📍 Main Street & 4th Ave</div>
                <div className="meta-tag">🏷️ Roads & Drainage</div>
              </div>
              <div className="hero-card-progress">
                <div className="progress-labels">
                  <span>Progress to Resolution</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>75%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: '75%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="home-section home-features-section">
        <div className="home-section-inner">
          <div className="home-section-header">
            <span className="section-eyebrow">Platform Capabilities</span>
            <h2>Designed for Civic Transparency</h2>
            <p className="section-subtitle">
              Modern tooling built for citizens, volunteers, and municipal leadership to collaborate with precision.
            </p>
          </div>

          <div className="home-features-grid">
            <article className="feature-card">
              <div className="feature-icon-wrapper">
                <span className="feature-number">01</span>
                <span className="feature-symbol">📌</span>
              </div>
              <h3>Report Local Issues</h3>
              <p>
                Pinpoint exact GPS coordinates, upload up to five site photographs, and submit categorized complaints in seconds without paperwork.
              </p>
            </article>

            <article className="feature-card">
              <div className="feature-icon-wrapper">
                <span className="feature-number">02</span>
                <span className="feature-symbol">⏱️</span>
              </div>
              <h3>Track Every Update</h3>
              <p>
                Receive live status transitions and official audit notes from pending verification through active dispatch and final resolution.
              </p>
            </article>

            <article className="feature-card">
              <div className="feature-icon-wrapper">
                <span className="feature-number">03</span>
                <span className="feature-symbol">🤝</span>
              </div>
              <h3>Make Community Impact</h3>
              <p>
                Bridge the gap between active neighborhood volunteers and municipal oversight to solve real-world problems transparently.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="home-section home-process-section">
        <div className="home-section-inner">
          <div className="home-section-header">
            <span className="section-eyebrow">Three Simple Steps</span>
            <h2>How It Works</h2>
            <p className="section-subtitle">
              From the initial citizen observation to verified neighborhood resolution.
            </p>
          </div>

          <div className="home-timeline">
            <div className="timeline-step">
              <div className="step-badge">1</div>
              <h4>Report a problem</h4>
              <p>
                Capture photographs, select the issue category, and drop a location pin on the map.
              </p>
            </div>

            <div className="timeline-connector" aria-hidden="true" />

            <div className="timeline-step">
              <div className="step-badge">2</div>
              <h4>Track progress</h4>
              <p>
                Municipal administrators verify the report and assign local volunteers with relevant expertise.
              </p>
            </div>

            <div className="timeline-connector" aria-hidden="true" />

            <div className="timeline-step">
              <div className="step-badge">3</div>
              <h4>Improve your community</h4>
              <p>
                Issues are marked resolved with verified notes, creating accountability across your district.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Community Impact Statistics Section (Real Backend Data Only) */}
      <section className="home-section home-stats-section">
        <div className="home-section-inner">
          <div className="home-section-header">
            <span className="section-eyebrow">Community Impact</span>
            <h2>Active Platform Activity</h2>
            <p className="section-subtitle">
              Live statistics reflecting verified reports and ongoing interventions across the district.
            </p>
          </div>

          <div className="home-stats-cards">
            <div className="home-stat-box">
              <p className="stat-box-label">Total Documented Issues</p>
              <p className="stat-box-number">{statsLoaded ? stats.total : '—'}</p>
              <p className="stat-box-desc">Reported by neighborhood citizens</p>
            </div>

            <div className="home-stat-box">
              <p className="stat-box-label">Verified & In Progress</p>
              <p className="stat-box-number" style={{ color: 'var(--color-accent)' }}>
                {statsLoaded ? stats.inProgress : '—'}
              </p>
              <p className="stat-box-desc">Active municipal & volunteer tasks</p>
            </div>

            <div className="home-stat-box">
              <p className="stat-box-label">Successfully Resolved</p>
              <p className="stat-box-number" style={{ color: 'var(--color-success)' }}>
                {statsLoaded ? stats.resolved : '—'}
              </p>
              <p className="stat-box-desc">Completed community resolutions</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="home-footer-inner">
          <div className="footer-brand-col">
            <Link to="/" className="home-brand">
              <span className="brand-emblem">◎</span>
              <span>LocalLens<span className="brand-gold-dot">.</span></span>
            </Link>
            <p className="footer-tagline">
              Modern classic platform empowering civic engagement, neighborhood transparency, and community-driven action.
            </p>
          </div>

          <div className="footer-nav-col">
            <h5>Navigation</h5>
            <Link to="/reports">Reports Directory</Link>
            <Link to="/reports-map">Interactive Heatmap</Link>
            <Link to="/reports/new">Report an Issue</Link>
          </div>

          <div className="footer-nav-col">
            <h5>Portals</h5>
            <Link to="/citizen">Citizen Portal</Link>
            <Link to="/volunteer">Volunteer Workspace</Link>
            <Link to="/admin">Admin Console</Link>
          </div>

          <div className="footer-nav-col">
            <h5>Account</h5>
            {user ? (
              <>
                <Link to="/profile">Profile Settings</Link>
                <Link to="/notifications">Notifications</Link>
                <button type="button" onClick={logout} className="footer-link-btn">
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login">Sign In</Link>
                <Link to="/register">Create Account</Link>
                <Link to="/forgot-password">Password Reset</Link>
              </>
            )}
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} LocalLens Platform. All rights reserved.</p>
          <p style={{ color: 'var(--color-secondary)' }}>Built for accountable, modern civic collaboration.</p>
        </div>
      </footer>
    </div>
  );
}
