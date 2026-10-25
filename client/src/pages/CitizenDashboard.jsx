import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import './CitizenDashboard.css';

const STATUS_OPTIONS = [
  'all',
  'pending',
  'verified',
  'assigned',
  'in-progress',
  'resolved',
  'rejected',
];

const formatStatus = (status) => {
  if (!status) return 'Unknown';
  return status
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatCategory = (category) => {
  if (!category) return 'Other';
  return category
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function CitizenDashboard() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const loadReports = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }

    try {
      const response = await api.get('/reports/mine');
      const data = response.data;

      const reportList = Array.isArray(data?.reports)
        ? data.reports
        : Array.isArray(data)
          ? data
          : [];

      setReports(reportList);
      setLoadError(false);
    } catch (error) {
      setLoadError(true);
      toast.error(
        error.response?.data?.message || 'Unable to load your reports'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function init() {
      try {
        const response = await api.get('/reports/mine');
        const data = response.data;
        const reportList = Array.isArray(data?.reports)
          ? data.reports
          : Array.isArray(data)
            ? data
            : [];

        if (!ignore) {
          setReports(reportList);
          setLoadError(false);
        }
      } catch (error) {
        if (!ignore) {
          setLoadError(true);
          toast.error(
            error.response?.data?.message || 'Unable to load your reports'
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      ignore = true;
    };
  }, []);

  const counts = useMemo(
    () => ({
      total: reports.length,
      pending: reports.filter((report) => report.status === 'pending').length,
      inProgress: reports.filter((report) =>
        ['verified', 'assigned', 'in-progress'].includes(report.status)
      ).length,
      resolved: reports.filter((report) => report.status === 'resolved').length,
    }),
    [reports]
  );

  const visibleReports = useMemo(() => {
    const term = search.trim().toLowerCase();
    return reports.filter((report) => {
      const matchesFilter = filter === 'all' || report.status === filter;
      const matchesSearch =
        !term ||
        report.title?.toLowerCase().includes(term) ||
        report.description?.toLowerCase().includes(term) ||
        report.category?.toLowerCase().includes(term) ||
        report.address?.toLowerCase().includes(term);
      return matchesFilter && matchesSearch;
    });
  }, [reports, filter, search]);

  return (
    <div className="citizen-page">
      <Navbar />

      <main className="citizen-dashboard">
        <header className="citizen-header">
          <div className="citizen-header-copy">
            <span className="citizen-eyebrow">
              <span aria-hidden="true">◎</span> Resident Workspace
            </span>
            <h1>Welcome back, {user?.name?.split(' ')[0] || 'Neighbor'}</h1>
            <p className="citizen-header-description">
              Track your submitted neighborhood issues, monitor volunteer resolution progress, and stay informed on civic actions.
            </p>
          </div>

          <div className="citizen-header-actions">
            <button
              type="button"
              onClick={() => loadReports(true)}
              disabled={refreshing || loading}
              className="btn btn-outline"
            >
              {refreshing ? 'Refreshing...' : '↻ Refresh Data'}
            </button>

            <Link to="/reports/new" className="btn btn-primary">
              + Report an Issue
            </Link>
          </div>
        </header>

        {/* 4 Summary Metric Cards */}
        <section className="citizen-stats" aria-label="Personal reports overview">
          <article className="citizen-stat-card">
            <div className="citizen-stat-header">
              <span className="citizen-stat-label">Total Submitted</span>
              <span className="citizen-stat-icon">📋</span>
            </div>
            <p className="citizen-stat-value">{counts.total}</p>
            <p className="citizen-stat-note">All your reported concerns</p>
          </article>

          <article className="citizen-stat-card">
            <div className="citizen-stat-header">
              <span className="citizen-stat-label">Pending Verification</span>
              <span className="citizen-stat-icon">⏳</span>
            </div>
            <p className="citizen-stat-value" style={{ color: 'var(--color-warning)' }}>
              {counts.pending}
            </p>
            <p className="citizen-stat-note">Awaiting municipal review</p>
          </article>

          <article className="citizen-stat-card">
            <div className="citizen-stat-header">
              <span className="citizen-stat-label">In Progress</span>
              <span className="citizen-stat-icon">⚡</span>
            </div>
            <p className="citizen-stat-value" style={{ color: 'var(--color-accent)' }}>
              {counts.inProgress}
            </p>
            <p className="citizen-stat-note">Assigned & actively underway</p>
          </article>

          <article className="citizen-stat-card">
            <div className="citizen-stat-header">
              <span className="citizen-stat-label">Resolved Issues</span>
              <span className="citizen-stat-icon">✓</span>
            </div>
            <p className="citizen-stat-value" style={{ color: 'var(--color-success)' }}>
              {counts.resolved}
            </p>
            <p className="citizen-stat-note">Verified completed resolutions</p>
          </article>
        </section>

        {/* Search & Filter Bar */}
        <div className="citizen-filter-bar">
          <div className="citizen-search-box">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your reports by title, description, or location..."
              className="search-input"
            />
          </div>

          <div className="citizen-filter-pills">
            {STATUS_OPTIONS.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilter(status)}
                className={`filter-pill ${filter === status ? 'active' : ''}`}
              >
                {status === 'all' ? 'All' : formatStatus(status)}
              </button>
            ))}
          </div>
        </div>

        {/* Reports Content List */}
        <section className="citizen-section">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div className="loading-spinner" style={{ margin: '0 auto 16px' }} />
              <p className="text-muted">Loading your community reports...</p>
            </div>
          ) : loadError ? (
            <div className="empty-state">
              <div className="empty-state-icon">⚠️</div>
              <h3>Unable to load your reports</h3>
              <p>There was a problem communicating with the municipal server.</p>
              <button
                type="button"
                onClick={() => loadReports(true)}
                className="btn btn-primary"
                style={{ marginTop: '16px' }}
              >
                Try Again
              </button>
            </div>
          ) : visibleReports.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <h3>No reports found</h3>
              <p>
                {search
                  ? `No reports match your search query "${search}".`
                  : filter === 'all'
                    ? "You haven't reported any community issues yet. Help improve your neighborhood today."
                    : `You don't have any reports currently matching the "${formatStatus(filter)}" status.`}
              </p>
              <Link to="/reports/new" className="btn btn-primary" style={{ marginTop: '16px' }}>
                + Report an Issue
              </Link>
            </div>
          ) : (
            <div className="citizen-reports-grid">
              {visibleReports.map((report) => (
                <Link
                  key={report._id}
                  to={`/reports/${report._id}`}
                  className="citizen-report-card"
                >
                  <div className="citizen-card-content">
                    <div className="citizen-card-top">
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span className="citizen-card-category">
                          {formatCategory(report.category)}
                        </span>
                        {report.priority && (
                          <span className={`priority-badge priority-${report.priority}`}>
                            {report.priority === 'urgent' && '🚨 Urgent'}
                            {report.priority === 'high' && '⚠️ High'}
                            {report.priority === 'medium' && '⏺ Medium'}
                            {report.priority === 'low' && '⚪ Low'}
                          </span>
                        )}
                      </div>
                      <span className={`status-badge status-${report.status || 'pending'}`}>
                        {formatStatus(report.status)}
                      </span>
                    </div>

                    <h3 className="citizen-card-title">{report.title}</h3>
                    <p className="citizen-card-desc">{report.description}</p>
                  </div>

                  <div className="citizen-card-meta">
                    <span className="citizen-card-address" title={report.address || 'Address provided'}>
                      📍 {report.address || 'Location on map'}
                    </span>
                    <span className="citizen-card-arrow">View Details →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
