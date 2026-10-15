import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api';
import './CitizenDashboard.css';

const STATUS_OPTIONS = [
  'all', 'pending', 'verified', 'assigned',
  'in-progress', 'resolved', 'rejected',
];

const formatStatus = (status) =>
  status === 'in-progress'
    ? 'In Progress'
    : status.charAt(0).toUpperCase() + status.slice(1);

export default function CitizenDashboard() {
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const loadReports = useCallback(async () => {
    try {
      const response = await api.get('/reports/mine');
      setReports(response.data.reports || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Unable to load your reports'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchInitialReports = async () => {
      try {
        const response = await api.get('/reports/mine');

        if (!cancelled) {
          setReports(response.data.reports || []);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error.response?.data?.message ||
              'Unable to load your reports'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchInitialReports();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    loadReports();
  };

  const counts = useMemo(
    () => ({
      total: reports.length,
      pending: reports.filter((r) => r.status === 'pending').length,
      inProgress: reports.filter(
        (r) => ['assigned', 'in-progress'].includes(r.status)
      ).length,
      resolved: reports.filter((r) => r.status === 'resolved').length,
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
        <Link to="/" className="citizen-home-link">← Home</Link>
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

            <button onClick={handleRefresh} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </button>

            <Link to="/reports/new">+ New Report</Link>
          </div>
        </div>

        {loading ? (
          <p className="citizen-message">Loading your reports...</p>
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
                    <h3>{report.title}</h3>
                    <p className="citizen-report-category">
                      {formatStatus(report.category)}
                    </p>
                  </div>

                  <span
                    className={`citizen-status citizen-status-${report.status}`}
                  >
                    {formatStatus(report.status)}
                  </span>
                </div>

                <p className="citizen-report-description">
                  {report.description}
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