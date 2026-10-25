import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const roleDashboardLinks = {
  citizen: { path: '/citizen', label: 'Citizen Dashboard' },
  volunteer: { path: '/volunteer', label: 'Volunteer Tasks' },
  admin: { path: '/admin', label: 'Admin Console' },
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  return (
    <header className="app-navbar">
      <div className="app-navbar-inner">
        {/* Brand */}
        <Link to="/" className="app-navbar-brand" aria-label="LocalLens Home">
          <span className="brand-emblem" aria-hidden="true">◎</span>
          <span>
            LocalLens<span className="brand-gold-dot">.</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="app-navbar-links" aria-label="Main Navigation">
          <Link
            to="/reports"
            className={`nav-link ${isActive('/reports') ? 'active' : ''}`}
          >
            Reports
          </Link>

          <Link
            to="/reports-map"
            className={`nav-link ${isActive('/reports-map') ? 'active' : ''}`}
          >
            Explore Map
          </Link>

          {user && roleDashboardLinks[user.role] && (
            <Link
              to={roleDashboardLinks[user.role].path}
              className={`nav-link ${
                isActive(roleDashboardLinks[user.role].path) ? 'active' : ''
              }`}
            >
              {roleDashboardLinks[user.role].label}
            </Link>
          )}

          {user?.role === 'admin' && (
            <Link
              to="/admin/analytics"
              className={`nav-link ${
                isActive('/admin/analytics') ? 'active' : ''
              }`}
            >
              Analytics
            </Link>
          )}
        </nav>

        {/* Right side actions */}
        <div className="app-navbar-actions">
          {user ? (
            <>
              <Link
                to="/reports/new"
                className="btn btn-sm btn-primary nav-action-report"
              >
                + Report Issue
              </Link>

              <NotificationBell />

              <div className="nav-user-menu">
                <Link
                  to="/profile"
                  className="nav-user-profile"
                  title="View Profile"
                >
                  <span className="nav-user-avatar">
                    {(user.name || 'U').charAt(0).toUpperCase()}
                  </span>
                  <span className="nav-user-name">
                    {user.name?.split(' ')[0] || 'Account'}
                  </span>
                  <span className={`role-pill role-${user.role}`}>
                    {user.role}
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={logout}
                  className="btn btn-sm btn-outline nav-logout-btn"
                  title="Sign out"
                >
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link font-semibold">
                Sign in
              </Link>
              <Link to="/register" className="btn btn-sm btn-primary">
                Join Community →
              </Link>
            </>
          )}

          {/* Mobile hamburger button */}
          <button
            type="button"
            className="mobile-menu-toggle"
            aria-label="Toggle Navigation Menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            <span className="hamburger-bar" />
            <span className="hamburger-bar" />
            <span className="hamburger-bar" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer">
          <Link
            to="/reports"
            onClick={() => setMobileMenuOpen(false)}
            className={`mobile-nav-link ${
              isActive('/reports') ? 'active' : ''
            }`}
          >
            Community Reports
          </Link>

          <Link
            to="/reports-map"
            onClick={() => setMobileMenuOpen(false)}
            className={`mobile-nav-link ${
              isActive('/reports-map') ? 'active' : ''
            }`}
          >
            Explore Map
          </Link>

          {user && roleDashboardLinks[user.role] && (
            <Link
              to={roleDashboardLinks[user.role].path}
              onClick={() => setMobileMenuOpen(false)}
              className={`mobile-nav-link ${
                isActive(roleDashboardLinks[user.role].path) ? 'active' : ''
              }`}
            >
              {roleDashboardLinks[user.role].label}
            </Link>
          )}

          {user?.role === 'admin' && (
            <Link
              to="/admin/analytics"
              onClick={() => setMobileMenuOpen(false)}
              className={`mobile-nav-link ${
                isActive('/admin/analytics') ? 'active' : ''
              }`}
            >
              Analytics Dashboard
            </Link>
          )}

          {user && (
            <Link
              to="/reports/new"
              onClick={() => setMobileMenuOpen(false)}
              className="btn btn-primary mobile-drawer-btn"
            >
              + Create New Report
            </Link>
          )}

          {user && (
            <Link
              to="/notifications"
              onClick={() => setMobileMenuOpen(false)}
              className="mobile-nav-link"
            >
              Notifications
            </Link>
          )}

          {user && (
            <Link
              to="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="mobile-nav-link"
            >
              Profile Settings ({user.name})
            </Link>
          )}

          {user ? (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
              }}
              className="btn btn-outline mobile-drawer-btn"
            >
              Sign out
            </button>
          ) : (
            <div className="mobile-auth-actions">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="btn btn-outline"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="btn btn-primary"
              >
                Join Community
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
