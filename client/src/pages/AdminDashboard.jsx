
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api';
import './AdminDashboard.css';

const STATUSES = [
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

function StatusBadge({ status }) {
  const safeStatus = status || 'unknown';

  return (
    <span className={`admin-badge admin-badge-${safeStatus}`}>
      {formatStatus(safeStatus)}
    </span>
  );
}

export default function AdminDashboard() {
  const [reports, setReports] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedVolunteers, setSelectedVolunteers] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busyId, setBusyId] = useState('');

  // Fetch reports and volunteers through one shared function.
  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(false);

    try {
      const [reportsResponse, volunteersResponse] = await Promise.all([
        api.get('/reports', { params: { limit: 50 } }),
        api.get('/users/volunteers'),
      ]);

      const reportsData = reportsResponse.data;
      const volunteersData = volunteersResponse.data;

      const reportList = Array.isArray(reportsData)
        ? reportsData
        : Array.isArray(reportsData?.reports)
          ? reportsData.reports
          : [];

      const volunteerList = Array.isArray(volunteersData?.volunteers)
        ? volunteersData.volunteers
        : Array.isArray(volunteersData)
          ? volunteersData
          : [];

      setReports(reportList);
      setVolunteers(volunteerList);
      setLoadError(false);
    } catch (error) {
      setLoadError(true);

      toast.error(
        error.response?.data?.message ||
          'Unable to load admin dashboard'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    loadData();
  };

  // Dashboard counts reflect the reports currently returned by the API.
  const counts = useMemo(() => {
    const result = { total: reports.length };

    for (const status of STATUSES.slice(1)) {
      result[status] = reports.filter(
        (report) => report.status === status
      ).length;
    }

    return result;
  }, [reports]);

  // Search by report details, category, address, or reporter name.
  const visibleReports = useMemo(() => {
    const term = search.trim().toLowerCase();

    return reports.filter((report) => {
      const matchesStatus =
        filter === 'all' || report.status === filter;

      const searchableValues = [
        report.title,
        report.description,
        report.category,
        report.address,
        report.reporter?.name,
        report.reporter?.email,
      ];

      const matchesSearch =
        !term ||
        searchableValues.some((value) =>
          String(value || '').toLowerCase().includes(term)
        );

      return matchesStatus && matchesSearch;
    });
  }, [reports, filter, search]);

  // Verify or reject a pending report.
  const updateStatus = async (report, status) => {
    if (busyId) return;

    setBusyId(report._id);

    try {
      const response = await api.patch(
        `/reports/${report._id}/status`,
        { status }
      );

      const updatedReport = response.data?.report;

      setReports((previous) =>
        previous.map((item) => {
          if (item._id !== report._id) return item;

          // Support either a full report response or a status-only response.
          return updatedReport
            ? { ...item, ...updatedReport }
            : { ...item, status };
        })
      );

      toast.success(
        `Report ${formatStatus(status).toLowerCase()} successfully`
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Unable to update report status'
      );
    } finally {
      setBusyId('');
    }
  };

  // Assign a verified report to a selected volunteer.
  const assignVolunteer = async (report) => {
    if (busyId) return;

    const volunteerId = selectedVolunteers[report._id];

    if (!volunteerId) {
      toast.error('Select a volunteer first');
      return;
    }

    setBusyId(report._id);

    try {
      const response = await api.patch(
        `/reports/${report._id}/assign`,
        { volunteerId }
      );

      const updatedReport = response.data?.report;

      setReports((previous) =>
        previous.map((item) => {
          if (item._id !== report._id) return item;

          return updatedReport
            ? { ...item, ...updatedReport }
            : {
                ...item,
                status: 'assigned',
                assignedVolunteer: volunteerId,
              };
        })
      );

      setSelectedVolunteers((previous) => ({
        ...previous,
        [report._id]: '',
      }));

      toast.success('Volunteer assigned successfully');
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Unable to assign volunteer'
      );
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <h2 className="admin-brand">
          Local<span>Lens</span>
        </h2>

        <p className="admin-sidebar-subtitle">
          Community Management
        </p>

        <p className="admin-nav-label">Workspace</p>

        <nav className="admin-nav">
          <Link className="admin-nav-link active" to="/admin">
            ▦ &nbsp; Dashboard
          </Link>

          <Link className="admin-nav-link" to="/reports">
            ◫ &nbsp; All Reports
          </Link>

          <Link className="admin-nav-link" to="/">
            ⌂ &nbsp; Home
          </Link>
          <Link className="admin-nav-link" to="/admin/analytics">
  ▥ &nbsp; Analytics
</Link>
        </nav>

        <div className="admin-sidebar-note">
          <strong>Community first</strong>
          <br />
          Review local issues and coordinate volunteers to improve your
          community.
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="admin-eyebrow">
              Administration / Overview
            </p>

            <h1 className="admin-title">
              Dashboard Overview
            </h1>

            <p className="admin-subtitle">
              Monitor community issues and manage report resolution.
            </p>
          </div>

          <div className="admin-user-chip">
            🛡️ Admin Workspace
          </div>
        </header>

        <section className="admin-stats">
          {[
            ['Total Reports', counts.total, 'Reports loaded'],
            ['Pending Review', counts.pending, 'Awaiting verification'],
            [
              'In Progress',
              counts['in-progress'],
              'Work underway',
            ],
            ['Resolved', counts.resolved, 'Issues completed'],
          ].map(([title, count, caption]) => (
            <article className="admin-stat-card" key={title}>
              <p className="admin-stat-label">{title}</p>
              <h2 className="admin-stat-value">{count}</h2>
              <p className="admin-stat-caption">{caption}</p>
            </article>
          ))}
        </section>

        <section className="admin-panel">
          <header className="admin-panel-header">
            <div>
              <h2 className="admin-panel-title">
                Community Reports
              </h2>

              <p className="admin-panel-description">
                Verify reports, assign volunteers, and track progress.
              </p>
            </div>

            <button
              type="button"
              className="admin-button admin-button-secondary"
              onClick={handleRefresh}
              disabled={loading || Boolean(busyId)}
            >
              {loading ? 'Loading...' : '↻ Refresh'}
            </button>
          </header>

          <div className="admin-controls">
            <input
              className="admin-input admin-search"
              type="search"
              placeholder="Search title, category, reporter..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search reports"
            />

            <select
              className="admin-select"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              aria-label="Filter reports by status"
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status === 'all'
                    ? 'All statuses'
                    : formatStatus(status)}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="admin-loading">
              Loading community reports...
            </div>
          ) : loadError ? (
            <div className="admin-empty">
              <h3>Unable to load dashboard data</h3>
              <p>
                Check your connection and make sure you are logged in
                with an admin account.
              </p>

              <button
                type="button"
                className="admin-button admin-button-secondary"
                onClick={handleRefresh}
              >
                Try again
              </button>
            </div>
          ) : visibleReports.length === 0 ? (
            <div className="admin-empty">
              <h3>No reports found</h3>
              <p>
                {reports.length === 0
                  ? 'There are no reports to display yet.'
                  : 'Try a different search or status filter.'}
              </p>
            </div>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Report</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Reported By</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleReports.map((report) => (
                    <tr key={report._id}>
                      <td>
                        <p className="admin-report-title">
                          {report.title || 'Untitled report'}
                        </p>

                        <p className="admin-report-description">
                          {report.description || 'No description provided.'}
                        </p>

                        {report.address && (
                          <p className="admin-muted">
                            📍 {report.address}
                          </p>
                        )}

                        <Link to={`/reports/${report._id}`}>
                          View details
                        </Link>
                      </td>

                      <td>{formatCategory(report.category)}</td>

                      <td>
                        <StatusBadge status={report.status} />
                      </td>

                      <td>
                        {report.reporter?.name || 'Unknown'}
                      </td>

                      <td>
                        <div className="admin-actions">
                          {report.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                className="admin-button admin-button-success"
                                disabled={Boolean(busyId)}
                                onClick={() =>
                                  updateStatus(report, 'verified')
                                }
                              >
                                {busyId === report._id
                                  ? 'Updating...'
                                  : 'Verify'}
                              </button>

                              <button
                                type="button"
                                className="admin-button admin-button-danger"
                                disabled={Boolean(busyId)}
                                onClick={() =>
                                  updateStatus(report, 'rejected')
                                }
                              >
                                {busyId === report._id
                                  ? 'Updating...'
                                  : 'Reject'}
                              </button>
                            </>
                          )}

                          {report.status === 'verified' && (
                            <div className="admin-assignment">
                              <select
                                className="admin-select"
                                aria-label={`Volunteer for ${
                                  report.title || 'report'
                                }`}
                                value={
                                  selectedVolunteers[report._id] || ''
                                }
                                disabled={Boolean(busyId)}
                                onChange={(event) =>
                                  setSelectedVolunteers((previous) => ({
                                    ...previous,
                                    [report._id]: event.target.value,
                                  }))
                                }
                              >
                                <option value="">
                                  Select volunteer
                                </option>

                                {volunteers.map((volunteer) => (
                                  <option
                                    key={volunteer._id}
                                    value={volunteer._id}
                                  >
                                    {volunteer.name || 'Unnamed volunteer'}
                                    {volunteer.isAvailable
                                      ? ' (Available)'
                                      : ''}
                                  </option>
                                ))}
                              </select>

                              <button
                                type="button"
                                className="admin-button"
                                disabled={
                                  Boolean(busyId) ||
                                  volunteers.length === 0
                                }
                                onClick={() => assignVolunteer(report)}
                              >
                                {busyId === report._id
                                  ? 'Assigning...'
                                  : 'Assign volunteer'}
                              </button>

                              {volunteers.length === 0 && (
                                <small className="admin-muted">
                                  No active volunteers found.
                                </small>
                              )}
                            </div>
                          )}

                          {report.status === 'assigned' && (
                            <span className="admin-muted">
                              Volunteer assigned
                            </span>
                          )}

                          {report.status === 'in-progress' && (
                            <span className="admin-muted">
                              Work underway
                            </span>
                          )}

                          {['resolved', 'rejected'].includes(report.status) && (
                            <span className="admin-muted">
                              Closed
                            </span>
                          )}

                          {![
                            'pending',
                            'verified',
                            'assigned',
                            'in-progress',
                            'resolved',
                            'rejected',
                          ].includes(report.status) && (
                            <span className="admin-muted">
                              No available actions
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !loadError && reports.length > 0 && (
            <p className="admin-muted">
              Showing {visibleReports.length} of {reports.length} loaded
              reports. The dashboard requests up to 50 reports.
            </p>
          )}
        </section>

        <footer className="admin-footer">
          LocalLens · Community issue management
        </footer>
      </main>
    </div>
  );
}
