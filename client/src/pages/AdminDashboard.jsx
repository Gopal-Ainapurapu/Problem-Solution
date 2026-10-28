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

  // Multi-Volunteer & Nearby Assignment Modal State
  const [assignModalReport, setAssignModalReport] = useState(null);
  const [assignTeamSize, setAssignTeamSize] = useState(1);
  const [selectedAssignIds, setSelectedAssignIds] = useState([]);
  const [nearbyVolunteers, setNearbyVolunteers] = useState([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [assignTab, setAssignTab] = useState('nearby'); // 'nearby' | 'all'

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

  const openAssignModal = async (report) => {
    setAssignModalReport(report);
    setAssignTeamSize(report.requiredTeamSize || 1);
    setSelectedAssignIds([]);
    setAssignTab('nearby');
    setLoadingNearby(true);

    try {
      const res = await api.get(`/team/eligible-volunteers/${report._id}`);
      setNearbyVolunteers(res.data?.volunteers || []);
    } catch {
      setNearbyVolunteers([]);
    } finally {
      setLoadingNearby(false);
    }
  };

  const toggleSelectVolunteer = (id) => {
    setSelectedAssignIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleConfirmTeamAssignment = async () => {
    if (!assignModalReport) return;
    if (selectedAssignIds.length === 0) {
      toast.error('Please select at least one volunteer to assign.');
      return;
    }

    setBusyId(assignModalReport._id);

    try {
      const response = await api.patch(
        `/reports/${assignModalReport._id}/assign`,
        {
          volunteerIds: selectedAssignIds,
          requiredTeamSize: Number(assignTeamSize) || selectedAssignIds.length,
        }
      );

      const updatedReport = response.data?.report;

      setReports((prev) =>
        prev.map((item) => {
          if (item._id !== assignModalReport._id) return item;
          return updatedReport ? { ...item, ...updatedReport } : item;
        })
      );

      toast.success(
        response.data?.message ||
          `${selectedAssignIds.length} volunteer(s) assigned successfully.`
      );
      setAssignModalReport(null);
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Unable to complete team assignment.'
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

                      <td style={{ minWidth: '220px' }}>
                        {report.status === 'verified' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
                                <option value="">Quick assign...</option>
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

                            <button
                              type="button"
                              onClick={() => openAssignModal(report)}
                              className="btn btn-sm btn-outline"
                              style={{ width: '100%', fontSize: '12px', padding: '5px 8px' }}
                            >
                              👥 Assign Multiple / Nearby ({report.requiredTeamSize || 1} Needed)
                            </button>
                          </div>
                        ) : report.assignedVolunteer ? (
                          <div>
                            <span style={{ fontSize: '13px', color: '#593A8B', fontWeight: 600 }}>
                              👤 Assigned ({report.teamMembers?.length > 1 ? `${report.teamMembers.length} volunteers` : '1 volunteer'})
                            </span>
                            <div style={{ fontSize: '11.5px', color: 'var(--color-secondary)' }}>
                              Req: {report.requiredTeamSize || 1} | {report.recruitmentStatus || 'active'}
                            </div>
                          </div>
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

      {/* Admin Multi-Volunteer & Nearby Assignment Modal */}
      {assignModalReport && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid var(--color-border)',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <header
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                background: 'var(--color-surface)',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 750,
                    textTransform: 'uppercase',
                    color: 'var(--color-primary)',
                    letterSpacing: '0.04em',
                  }}
                >
                  Multi-Volunteer & Geospatial Assignment
                </span>
                <h3 style={{ margin: '4px 0 2px', fontSize: '1.25rem' }}>
                  Assign Volunteers to Report
                </h3>
                <p style={{ margin: 0, color: 'var(--color-secondary)', fontSize: '13px' }}>
                  "{assignModalReport.title}" • 📍 {assignModalReport.address || 'Reported Location'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalReport(null)}
                className="btn btn-outline"
                style={{ padding: '6px 10px', fontSize: '14px', borderRadius: '50%' }}
              >
                ✕
              </button>
            </header>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              {/* Define Required Team Size */}
              <div
                style={{
                  background: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '10px',
                  padding: '14px 18px',
                  marginBottom: '18px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <label
                      htmlFor="modal-team-size"
                      style={{ fontWeight: 700, fontSize: '13px', display: 'block', marginBottom: '2px' }}
                    >
                      Define Required Volunteers / Team Size:
                    </label>
                    <span style={{ fontSize: '12px', color: 'var(--color-secondary)' }}>
                      Set how many volunteers are expected for this task
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      id="modal-team-size"
                      type="number"
                      min={1}
                      max={20}
                      value={assignTeamSize}
                      onChange={(e) => setAssignTeamSize(Math.max(1, Math.min(20, Number(e.target.value))))}
                      className="form-control"
                      style={{ width: '80px', textAlign: 'center', fontWeight: 700 }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>members</span>
                  </div>
                </div>
              </div>

              {/* Volunteer Source Tabs: Surrounded/Nearby vs All */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <button
                  type="button"
                  onClick={() => setAssignTab('nearby')}
                  className={`btn btn-sm ${assignTab === 'nearby' ? 'btn-primary' : 'btn-outline'}`}
                >
                  📍 Surrounded / Nearby Volunteers ({nearbyVolunteers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAssignTab('all')}
                  className={`btn btn-sm ${assignTab === 'all' ? 'btn-primary' : 'btn-outline'}`}
                >
                  📋 All Volunteers Roster ({volunteers.length})
                </button>
              </div>

              {/* Tab 1: Nearby Volunteers */}
              {assignTab === 'nearby' && (
                <div>
                  {loadingNearby ? (
                    <div style={{ textAlign: 'center', padding: '30px' }}>
                      <div className="loading-spinner" style={{ margin: '0 auto 8px' }} />
                      <p style={{ fontSize: '12.5px', color: 'var(--color-secondary)' }}>
                        Scanning volunteers near report coordinates...
                      </p>
                    </div>
                  ) : nearbyVolunteers.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px', background: '#fdfbf7', borderRadius: '8px' }}>
                      <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-secondary)' }}>
                        No nearby volunteers found within default range. Switch to "All Volunteers Roster" tab to assign from the complete city roster.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                      {nearbyVolunteers.map((vol) => {
                        const isSelected = selectedAssignIds.includes(vol._id);
                        return (
                          <div
                            key={vol._id}
                            onClick={() => toggleSelectVolunteer(vol._id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 14px',
                              borderRadius: '8px',
                              border: `1.5px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                              background: isSelected ? 'var(--color-surface-hover, #f3f7f4)' : '#ffffff',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                              />
                              <div>
                                <div style={{ fontWeight: 700, fontSize: '13.5px' }}>{vol.name}</div>
                                <div style={{ fontSize: '12px', color: 'var(--color-secondary)' }}>
                                  {vol.email} • {vol.phone || 'No phone'}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {vol.distanceKm !== null && (
                                <span
                                  style={{
                                    fontSize: '11.5px',
                                    fontWeight: 700,
                                    background: '#e8f0ea',
                                    color: 'var(--color-primary)',
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                  }}
                                >
                                  📍 {vol.distanceKm} km
                                </span>
                              )}
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: vol.isAvailable ? 'var(--color-success)' : 'var(--color-muted)',
                                }}
                              >
                                {vol.isAvailable ? '● Available' : '○ Busy'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: All Volunteers */}
              {assignTab === 'all' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                  {volunteers.map((vol) => {
                    const isSelected = selectedAssignIds.includes(vol._id);
                    return (
                      <div
                        key={vol._id}
                        onClick={() => toggleSelectVolunteer(vol._id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: `1.5px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          background: isSelected ? 'var(--color-surface-hover, #f3f7f4)' : '#ffffff',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '13.5px' }}>{vol.name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--color-secondary)' }}>
                              {vol.email}
                            </div>
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: vol.isAvailable ? 'var(--color-success)' : 'var(--color-muted)',
                          }}
                        >
                          {vol.isAvailable ? '● Available' : '○ Busy'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <footer
              style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--color-surface)',
              }}
            >
              <div style={{ fontSize: '13px' }}>
                Selected: <strong>{selectedAssignIds.length}</strong> / Required: <strong>{assignTeamSize}</strong>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setAssignModalReport(null)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedAssignIds.length === 0 || busyId === assignModalReport._id}
                  onClick={handleConfirmTeamAssignment}
                  className="btn btn-primary"
                >
                  {busyId === assignModalReport._id ? 'Assigning...' : `Confirm Assignment (${selectedAssignIds.length})`}
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
