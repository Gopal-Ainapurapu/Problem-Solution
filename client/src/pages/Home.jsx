
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';
import './Home.css';

const features = [
  {
    number: '01',
    icon: '◎',
    title: 'Report an issue',
    description:
      'Report damaged roads, drainage problems, garbage and other local concerns.',
  },
  {
    number: '02',
    icon: '↗',
    title: 'Track progress',
    description:
      'Follow your reports from submission to resolution with clear status updates.',
  },
  {
    number: '03',
    icon: '⌖',
    title: 'Explore your area',
    description:
      'Discover reported community issues on an interactive map and identify hotspots.',
  },
];

const dashboardLinks = {
  citizen: {
    path: '/citizen',
    label: 'Citizen Dashboard',
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

export default function Home() {
  const { user, logout } = useAuth();
  const dashboard = user ? dashboardLinks[user.role] : null;

  return (
    <main className="home-page">
      <header className="home-navbar">
        <Link to="/" className="home-brand" aria-label="LocalLens home">
          <span className="home-brand-icon">L</span>
          <span>
            Local<span className="home-brand-accent">Lens</span>
          </span>
        </Link>

        <nav className="home-nav-links" aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#features">Features</a>
          <Link to="/reports">Community reports</Link>
          <Link to="/reports-map">Explore map</Link>
        </nav>

        <div className="home-nav-actions">
          {user ? (
            <>
              <NotificationBell />
              <Link to="/profile" className="home-profile-link">
                {user.name?.split(' ')[0] || 'Profile'}
              </Link>
              <button
                type="button"
                className="home-button home-button-outline home-logout"
                onClick={logout}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="home-login-link">
                Log in
              </Link>
              <Link to="/register" className="home-button home-button-primary">
                Get started <span aria-hidden="true">↗</span>
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="home-hero">
        <div className="home-hero-content">
          <div className="home-eyebrow">
            <span className="home-eyebrow-dot" />
            A better community starts here
          </div>

          <h1>
            Small actions.
            <br />
            <span>Meaningful change.</span>
          </h1>

          <p className="home-hero-description">
            Your neighbourhood deserves better. Report local problems,
            track every update, and work together to create cleaner,
            safer and more connected communities.
          </p>

          <div className="home-hero-actions">
            {user ? (
              <>
                {dashboard && (
                  <Link
                    to={dashboard.path}
                    className="home-button home-button-primary"
                  >
                    Open dashboard <span aria-hidden="true">→</span>
                  </Link>
                )}
                <Link
                  to="/reports/new"
                  className="home-button home-button-outline"
                >
                  + Report an issue
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/register"
                  className="home-button home-button-primary"
                >
                  Make a difference <span aria-hidden="true">→</span>
                </Link>
                <Link
                  to="/reports"
                  className="home-button home-button-outline"
                >
                  Explore community reports
                </Link>
              </>
            )}
          </div>

          <div className="home-trust-note">
            <span className="home-trust-icon">✓</span>
            <span>One community. Shared responsibility. Real progress.</span>
          </div>
        </div>

        <div className="home-hero-visual" aria-label="Community improvement illustration">
          <div className="home-visual-orbit home-orbit-one" />
          <div className="home-visual-orbit home-orbit-two" />

          <div className="home-visual-card home-visual-main">
            <div className="home-visual-top">
              <span className="home-visual-label">COMMUNITY IMPACT</span>
              <span className="home-visual-sparkle">✳</span>
            </div>

            <div className="home-illustration">
              <div className="home-sun" />
              <div className="home-building building-one">
                <span />
                <span />
                <span />
              </div>
              <div className="home-building building-two">
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="home-building building-three">
                <span />
                <span />
              </div>
              <div className="home-ground" />
              <div className="home-tree tree-one">
                <span />
              </div>
              <div className="home-tree tree-two">
                <span />
              </div>
              <div className="home-person">
                <span className="home-person-head" />
                <span className="home-person-body" />
              </div>
              <div className="home-location-pin">
                <span>✓</span>
              </div>
            </div>

            <div className="home-visual-caption">
              <div>
                <strong>Better neighbourhoods</strong>
                <p>Built by people like you.</p>
              </div>
              <span className="home-caption-arrow">↗</span>
            </div>
          </div>

          <div className="home-floating-card home-floating-top">
            <span className="home-floating-icon">⌖</span>
            <div>
              <strong>Local first</strong>
              <span>Community-powered</span>
            </div>
          </div>

          <div className="home-floating-card home-floating-bottom">
            <span className="home-floating-check">✓</span>
            <div>
              <strong>Every voice matters</strong>
              <span>Every report counts</span>
            </div>
          </div>
        </div>

        <div className="home-hero-decoration" aria-hidden="true" />
      </section>

      <section className="home-features" id="features">
        <div className="home-section-heading">
          <span className="home-section-label">HOW LOCALLENS HELPS</span>
          <h2>
            From local concerns
            <br />
            <span>to lasting solutions.</span>
          </h2>
          <p>
            A simple, transparent way to make your neighbourhood a better
            place to live.
          </p>
        </div>

        <div className="home-feature-grid">
          {features.map((feature) => (
            <article className="home-feature-card" key={feature.number}>
              <div className="home-feature-card-top">
                <span className="home-feature-icon">{feature.icon}</span>
                <span className="home-feature-number">{feature.number}</span>
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              <Link
                to={
                  feature.number === '01'
                    ? user
                      ? '/reports/new'
                      : '/register'
                    : feature.number === '02'
                      ? '/reports'
                      : '/reports-map'
                }
                className="home-feature-link"
              >
                Explore <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="home-how" id="how-it-works">
        <div className="home-how-copy">
          <span className="home-section-label">SIMPLE BY DESIGN</span>
          <h2>
            Change starts
            <br />
            with <span>one report.</span>
          </h2>
          <p>
            Notice a problem in your neighbourhood? Share the details,
            follow its progress, and help your community move towards a
            solution.
          </p>
          <Link
            to={user ? '/reports/new' : '/register'}
            className="home-button home-button-light"
          >
            {user ? 'Create a report' : 'Join the community'}{' '}
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="home-steps">
          <article className="home-step">
            <span className="home-step-number">01</span>
            <div>
              <h3>Spot a problem</h3>
              <p>Identify an issue that needs attention in your area.</p>
            </div>
          </article>
          <article className="home-step">
            <span className="home-step-number">02</span>
            <div>
              <h3>Share the details</h3>
              <p>Submit a report with its location and useful information.</p>
            </div>
          </article>
          <article className="home-step">
            <span className="home-step-number">03</span>
            <div>
              <h3>Follow the progress</h3>
              <p>Check updates as the report moves towards resolution.</p>
            </div>
          </article>
        </div>
      </section>

      <footer className="home-footer">
        <Link to="/" className="home-brand">
          <span className="home-brand-icon">L</span>
          <span>
            Local<span className="home-brand-accent">Lens</span>
          </span>
        </Link>

        <p>Helping communities turn everyday concerns into meaningful change.</p>

        <div className="home-footer-links">
          <Link to="/reports">Reports</Link>
          <Link to="/reports-map">Community map</Link>
          {user && <Link to="/profile">My profile</Link>}
        </div>

        <span className="home-copyright">
          © {new Date().getFullYear()} LocalLens
        </span>
      </footer>
    </main>
  );
}
