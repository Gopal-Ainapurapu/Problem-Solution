
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api';
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
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const loadReports = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
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
        error.response?.data?.message ||
          'Unable to load your reports'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const counts = useMemo(
    () => ({
      total: reports.length,
      pending: reports.filter((report) => report.status === 'pending').length,
      inProgress: reports.filter((report) =>
        ['assigned', 'in-progress'].includes(report.status)
      ).length,
      resolved: reports.filter((report) => report.status === 'resolved').length,
    }),
    [reports]
  );

  const visibleReports = useMemo(
    () =>
      reports.filter(
        (report) => filter === 'all' || report.status === filter
      ),
    [reports, filter]
  );

  return (
    <main className="citizen-dashboard">
      <header className="citizen-header">
        <Link to="/" className="citizen-home-link">
          ← Home
        </Link>

        <p className="citizen-eyebrow">LOCALLENS / CITIZEN</p>
        <h1>My Dashboard</h1>
        <p>Track the local issues you have reported to your community.</p>
      </header>

      <section className="citizen-stats">
        {[
          ['My reports', counts.total],
          ['Pending review', counts.pending],
          ['Being handled', counts.inProgress],
          ['Resolved', counts.resolved],
        ].map(([title, count]) => (
          <article className="citizen-stat-card" key={title}>
            <p>{title}</p>
            <h2>{count}</h2>
          </article>
        ))}
      </section>

      <section className="citizen-reports-section">
        <div className="citizen-section-heading">
          <div>
            <h2>Reports submitted by me</h2>
            <p>Follow each report from submission to resolution.</p>
          </div>

          <div className="citizen-actions">
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              aria-label="Filter reports by status"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status === 'all' ? 'All statuses' : formatStatus(status)}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => loadReports(true)}
              disabled={loading || refreshing}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>

            <Link to="/reports/new">+ New Report</Link>
          </div>
        </div>

        {loading ? (
          <p className="citizen-message">Loading your reports...</p>
        ) : loadError ? (
          <div className="citizen-empty">
            <h3>Couldn't load your reports</h3>
            <p>Check your connection and try again.</p>
            <button
              type="button"
              onClick={() => loadReports()}
              disabled={refreshing}
            >
              Try again
            </button>
          </div>
        ) : visibleReports.length === 0 ? (
          <div className="citizen-empty">
            <h3>No reports found</h3>
            <p>
              {reports.length === 0
                ? 'You have not submitted any reports yet.'
                : 'Try selecting another status filter.'}
            </p>
            <Link to="/reports/new">Create your first report</Link>
          </div>
        ) : (
          <div className="citizen-report-list">
            {visibleReports.map((report) => (
              <article className="citizen-report-card" key={report._id}>
                <div className="citizen-report-top">
                  <div>
                    <h3>{report.title || 'Untitled report'}</h3>
                    <p className="citizen-report-category">
                      {formatCategory(report.category)}
                    </p>
                  </div>

                  <span
                    className={`citizen-status citizen-status-${
                      report.status || 'unknown'
                    }`}
                  >
                    {formatStatus(report.status)}
                  </span>
                </div>

                <p className="citizen-report-description">
                  {report.description || 'No description provided.'}
                </p>

                {report.address && (
                  <p className="citizen-report-address">
                    📍 {report.address}
                  </p>
                )}

                {report.resolutionNote && (
                  <p className="citizen-resolution-note">
                    <strong>Resolution note:</strong> {report.resolutionNote}
                  </p>
                )}

                <Link
                  className="citizen-details-link"
                  to={`/reports/${report._id}`}
                >
                  View report details →
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
