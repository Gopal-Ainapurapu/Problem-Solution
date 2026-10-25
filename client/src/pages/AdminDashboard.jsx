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

export default function AdminDashboard() {
  const [reports, setReports] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedVolunteers, setSelectedVolunteers] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [volunteersError, setVolunteersError] = useState('');
  const [busyId, setBusyId] = useState('');

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }

    try {
      const [reportsResult, volunteersResult] = await Promise.allSettled([
        api.get('/reports', { params: { limit: 50 } }),
        api.get('/users/volunteers'),
      ]);

      if (reportsResult.status === 'fulfilled') {
        const reportsData = reportsResult.value.data;
        const reportList = Array.isArray(reportsData)
          ? reportsData
          : Array.isArray(reportsData?.reports)
            ? reportsData.reports
            : [];
        setReports(reportList);
        setLoadError(false);
      } else {
        setLoadError(true);
        toast.error(
          reportsResult.reason?.response?.data?.message || 'Unable to load reports'
        );
      }

      if (volunteersResult.status === 'fulfilled') {
        const volunteersData = volunteersResult.value.data;
        const volunteerList = Array.isArray(volunteersData?.volunteers)
          ? volunteersData.volunteers
          : Array.isArray(volunteersData)
            ? volunteersData
            : [];
        setVolunteers(volunteerList);
        setVolunteersError('');
      } else {
        const status = volunteersResult.reason?.response?.status;
        if (status === 401 || status === 403) {
          setVolunteersError('Administrator session required to list or assign volunteers.');
        } else {
          setVolunteersError('Unable to load volunteer roster.');
        }
      }
    } catch (error) {
      setLoadError(true);
      toast.error(
        error.response?.data?.message || 'Unable to load admin dashboard'
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
        const [reportsResult, volunteersResult] = await Promise.allSettled([
          api.get('/reports', { params: { limit: 50 } }),
          api.get('/users/volunteers'),
        ]);

        if (ignore) return;

        if (reportsResult.status === 'fulfilled') {
          const reportsData = reportsResult.value.data;
          const reportList = Array.isArray(reportsData)
            ? reportsData
            : Array.isArray(reportsData?.reports)
              ? reportsData.reports
              : [];
          setReports(reportList);
          setLoadError(false);
        } else {
          setLoadError(true);
          toast.error(
            reportsResult.reason?.response?.data?.message || 'Unable to load reports'
          );
        }

        if (volunteersResult.status === 'fulfilled') {
          const volunteersData = volunteersResult.value.data;
          const volunteerList = Array.isArray(volunteersData?.volunteers)
            ? volunteersData.volunteers
            : Array.isArray(volunteersData)
              ? volunteersData
              : [];
          setVolunteers(volunteerList);
          setVolunteersError('');
        } else {
          const status = volunteersResult.reason?.response?.status;
          if (status === 401 || status === 403) {
            setVolunteersError('Administrator session required to list or assign volunteers.');
          } else {
            setVolunteersError('Unable to load volunteer roster.');
          }
        }
      } catch (error) {
        if (!ignore) {
          setLoadError(true);
          toast.error(
            error.response?.data?.message || 'Unable to load admin dashboard'
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

  const counts = useMemo(() => {
    const result = { total: reports.length };
    for (const status of STATUSES.slice(1)) {
      result[status] = reports.filter((r) => r.status === status).length;
    }
    return result;
  }, [reports]);

  const visibleReports = useMemo(() => {
    const term = search.trim().toLowerCase();

    return reports.filter((report) => {
      const matchesStatus = filter === 'all' || report.status === filter;
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

  const updateStatus = async (report, status) => {
    if (busyId) return;
    setBusyId(report._id);

    try {
      const response = await api.patch(
        `/reports/${report._id}/status`,
        { status }
      );

      const updatedReport = response.data?.report;

      setReports((prev) =>
        prev.map((item) => {
          if (item._id !== report._id) return item;
          return updatedReport ? { ...item, ...updatedReport } : { ...item, status };
        })
      );

      toast.success(`Report marked ${formatStatus(status).toLowerCase()}`);
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Unable to update report status'
      );
    } finally {
      setBusyId('');
    }
  };

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

      setReports((prev) =>
        prev.map((item) => {
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

      setSelectedVolunteers((prev) => ({ ...prev, [report._id]: '' }));
      toast.success('Volunteer assigned successfully');
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Unable to assign volunteer'
      );
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div>
          <Link to="/" className="admin-brand">
            <span
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--color-primary)',
                color: 'white',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '15px',
                fontWeight: 800,
              }}
            >
              ◎
            </span>
            <span>
              Local<span>Lens</span>
            </span>
          </Link>
          <p className="admin-sidebar-subtitle">Administration Workspace</p>

          <p className="admin-nav-label">Management</p>
          <nav className="admin-nav">
            <Link className="admin-nav-link active" to="/admin">
              <span>▦</span> Reports Console
            </Link>
            <Link className="admin-nav-link" to="/admin/analytics">
              <span>📊</span> Analytics & Trends
            </Link>
            <Link className="admin-nav-link" to="/reports-map">
              <span>🗺️</span> Issue Heatmap
            </Link>
            <Link className="admin-nav-link" to="/reports">
              <span>📋</span> Public Directory
            </Link>
          </nav>
        </div>

        <div className="admin-sidebar-footer">
          <Link className="admin-nav-link" to="/profile">
            <span>👤</span> Admin Profile
          </Link>
          <Link className="admin-nav-link" to="/">
            <span>←</span> Back to Public Site
          </Link>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="admin-main">
        <header className="admin-header">
          <div className="admin-header-copy">
            <span className="admin-eyebrow">
              <span aria-hidden="true">🔒</span> Municipal Operations
            </span>
            <h1>Reports Console</h1>
            <p className="admin-header-subtitle">
              Verify submitted issues, assign verified tasks to available volunteers, and oversee city resolutions.
            </p>
          </div>

          <div className="admin-header-actions">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing || loading}
              className="btn btn-outline"
            >
              {refreshing ? 'Refreshing...' : '↻ Refresh Data'}
            </button>

            <Link to="/admin/analytics" className="btn btn-primary">
              View Analytics Charts →
            </Link>
          </div>
        </header>

        {/* 7 Status Summary Cards */}
        <section className="admin-stats-grid" aria-label="Status counts">
          <article className="admin-stat-card">
            <p className="admin-stat-title">Total Reports</p>
            <p className="admin-stat-number">{counts.total}</p>
          </article>
          <article className="admin-stat-card">
            <p className="admin-stat-title" style={{ color: '#89500b' }}>Pending Review</p>
            <p className="admin-stat-number" style={{ color: '#89500b' }}>{counts.pending || 0}</p>
          </article>
          <article className="admin-stat-card">
            <p className="admin-stat-title" style={{ color: '#2457a7' }}>Verified</p>
            <p className="admin-stat-number" style={{ color: '#2457a7' }}>{counts.verified || 0}</p>
          </article>
          <article className="admin-stat-card">
            <p className="admin-stat-title" style={{ color: '#6840a4' }}>Assigned</p>
            <p className="admin-stat-number" style={{ color: '#6840a4' }}>{counts.assigned || 0}</p>
          </article>
          <article className="admin-stat-card">
            <p className="admin-stat-title" style={{ color: '#a4471a' }}>In Progress</p>
            <p className="admin-stat-number" style={{ color: '#a4471a' }}>{counts['in-progress'] || 0}</p>
          </article>
          <article className="admin-stat-card">
            <p className="admin-stat-title" style={{ color: '#216b43' }}>Resolved</p>
            <p className="admin-stat-number" style={{ color: '#216b43' }}>{counts.resolved || 0}</p>
          </article>
          <article className="admin-stat-card">
            <p className="admin-stat-title" style={{ color: '#a12f2b' }}>Rejected</p>
            <p className="admin-stat-number" style={{ color: '#a12f2b' }}>{counts.rejected || 0}</p>
          </article>
        </section>

        {/* Filter & Search Bar */}
        <div className="admin-filter-bar">
          <div className="admin-search-box">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reports by title, category, address or citizen..."
              className="search-input"
            />
          </div>

          <div className="admin-status-pills">
            {STATUSES.map((status) => (
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

        {volunteersError && (
          <div
            style={{
              backgroundColor: '#FEF3C7',
              border: '1px solid #FCD34D',
              borderRadius: '12px',
              padding: '12px 18px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#92400E',
              fontSize: '14px',
            }}
          >
            <span style={{ fontSize: '18px' }} aria-hidden="true">⚠️</span>
            <div>
              <strong>Volunteer Access:</strong> {volunteersError} Ensure you are logged in with an administrator account (e.g. <code>admin@locallens.test</code>).
            </div>
          </div>
        )}

        {/* Reports Table Container */}
        <section className="admin-table-container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div className="loading-spinner" style={{ margin: '0 auto 16px' }} />
              <p className="text-muted">Loading reports directory...</p>
            </div>
          ) : loadError ? (
            <div className="empty-state">
              <h3>Unable to load reports</h3>
              <p>There was an error communicating with the API.</p>
              <button
                type="button"
                onClick={() => loadData(true)}
                className="btn btn-primary"
                style={{ marginTop: '16px' }}
              >
                Try Again
              </button>
            </div>
          ) : visibleReports.length === 0 ? (
            <div className="empty-state">
              <h3>No reports found</h3>
              <p>No community issues match the selected filter criteria.</p>
            </div>
          ) : (
            <div className="admin-table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Report Info</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Location / Citizen</th>
                    <th>Volunteer Assignment</th>
                    <th>Admin Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleReports.map((report) => (
                    <tr key={report._id}>
                      <td style={{ minWidth: '220px' }}>
                        <Link
                          to={`/reports/${report._id}`}
                          className="admin-report-title"
                        >
                          {report.title}
                        </Link>
                        <span className="admin-report-sub">
                          Reported on {new Date(report.createdAt).toLocaleDateString()}
                        </span>
                      </td>

                      <td>
                        <span className="citizen-card-category">
                          {formatCategory(report.category)}
                        </span>
                      </td>

                      <td>
                        <span className={`status-badge status-${report.status}`}>
                          {formatStatus(report.status)}
                        </span>
                      </td>

                      <td style={{ minWidth: '180px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>
                          📍 {report.address || 'Address on map'}
                        </div>
                        <div className="admin-report-sub">
                          By: {report.reporter?.name || 'Citizen'}
                        </div>
                      </td>

                      <td style={{ minWidth: '200px' }}>
                        {report.status === 'verified' ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <select
                              value={selectedVolunteers[report._id] || ''}
                              onChange={(e) =>
                                setSelectedVolunteers((prev) => ({
                                  ...prev,
                                  [report._id]: e.target.value,
                                }))
                              }
                              className="admin-volunteer-select"
                            >
                              <option value="">Select volunteer...</option>
                              {volunteers.map((v) => (
                                <option key={v._id} value={v._id}>
                                  {v.name} {v.isAvailable ? '(Available)' : '(Busy)'}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              disabled={
                                busyId === report._id ||
                                !selectedVolunteers[report._id]
                              }
                              onClick={() => assignVolunteer(report)}
                              className="btn btn-sm btn-primary"
                            >
                              Assign
                            </button>
                          </div>
                        ) : report.assignedVolunteer ? (
                          <span style={{ fontSize: '13px', color: '#6840a4', fontWeight: 600 }}>
                            👤 Assigned to volunteer
                          </span>
                        ) : (
                          <span className="text-muted" style={{ fontSize: '13px' }}>
                            {report.status === 'pending'
                              ? 'Verify first to assign'
                              : 'No volunteer assigned'}
                          </span>
                        )}
                      </td>

                      <td style={{ minWidth: '180px' }}>
                        <div className="admin-actions-cell">
                          {report.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                disabled={busyId === report._id}
                                onClick={() => updateStatus(report, 'verified')}
                                className="btn btn-sm btn-primary"
                                style={{
                                  backgroundColor: 'var(--color-success)',
                                  borderColor: 'var(--color-success)',
                                }}
                              >
                                ✓ Verify
                              </button>
                              <button
                                type="button"
                                disabled={busyId === report._id}
                                onClick={() => updateStatus(report, 'rejected')}
                                className="btn btn-sm btn-danger"
                              >
                                ✕ Reject
                              </button>
                            </>
                          )}

                          {report.status === 'verified' && (
                            <button
                              type="button"
                              disabled={busyId === report._id}
                              onClick={() => updateStatus(report, 'rejected')}
                              className="btn btn-sm btn-danger"
                            >
                              ✕ Reject
                            </button>
                          )}

                          {['assigned', 'in-progress'].includes(report.status) && (
                            <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                              In Progress by Volunteer
                            </span>
                          )}

                          {report.status === 'resolved' && (
                            <span style={{ fontSize: '13px', color: 'var(--color-success)', fontWeight: 700 }}>
                              ✓ Resolved
                            </span>
                          )}

                          <Link
                            to={`/reports/${report._id}/workspace`}
                            className="btn btn-sm btn-outline"
                            title="Manage Team & View Workspace"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                          >
                            👥 Team Space
                          </Link>

                          {report.status === 'rejected' && (
                            <span style={{ fontSize: '13px', color: 'var(--color-danger)', fontWeight: 700 }}>
                              ✕ Rejected
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
        </section>
      </main>
    </div>
  );
}
