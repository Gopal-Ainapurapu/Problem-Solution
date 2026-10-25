import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import './VolunteerDashboard.css';

const STATUS_OPTIONS = [
  'all',
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

export default function VolunteerDashboard() {
  const { user, updateUser } = useAuth();

  // Navigation tab: 'assigned' | 'available' | 'requests' | 'invitations'
  const [activeTab, setActiveTab] = useState('assigned');

  // Data states
  const [reports, setReports] = useState([]);
  const [availableTasks, setAvailableTasks] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [myInvitations, setMyInvitations] = useState([]);

  const [notes, setNotes] = useState({});
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [resolvingId, setResolvingId] = useState('');
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  // Request modal/dialog state
  const [requestingReport, setRequestingReport] = useState(null);
  const [requestNote, setRequestNote] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const loadAllData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);

    try {
      const [assignedRes, availableRes, requestsRes, invitesRes] =
        await Promise.all([
          api.get('/reports/assigned').catch(() => ({ data: { reports: [] } })),
          api.get('/team/available-tasks').catch(() => ({ data: { tasks: [] } })),
          api.get('/team/my-requests').catch(() => ({ data: { requests: [] } })),
          api.get('/team/my-invitations').catch(() => ({ data: { invitations: [] } })),
        ]);

      const assignedList = Array.isArray(assignedRes.data?.reports)
        ? assignedRes.data.reports
        : Array.isArray(assignedRes.data)
          ? assignedRes.data
          : [];

      setReports(assignedList);
      setAvailableTasks(availableRes.data?.tasks || []);
      setMyRequests(requestsRes.data?.requests || []);
      setMyInvitations(invitesRes.data?.invitations || []);
      setLoadError(false);
    } catch (error) {
      setLoadError(true);
      toast.error(
        error.response?.data?.message || 'Unable to load volunteer data'
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
        const [assignedRes, availableRes, requestsRes, invitesRes] =
          await Promise.all([
            api.get('/reports/assigned').catch(() => ({ data: { reports: [] } })),
            api.get('/team/available-tasks').catch(() => ({ data: { tasks: [] } })),
            api.get('/team/my-requests').catch(() => ({ data: { requests: [] } })),
            api.get('/team/my-invitations').catch(() => ({ data: { invitations: [] } })),
          ]);

        if (!ignore) {
          const assignedList = Array.isArray(assignedRes.data?.reports)
            ? assignedRes.data.reports
            : Array.isArray(assignedRes.data)
              ? assignedRes.data
              : [];

          setReports(assignedList);
          setAvailableTasks(availableRes.data?.tasks || []);
          setMyRequests(requestsRes.data?.requests || []);
          setMyInvitations(invitesRes.data?.invitations || []);
          setLoadError(false);
        }
      } catch (error) {
        if (!ignore) {
          setLoadError(true);
          toast.error(
            error.response?.data?.message || 'Unable to load volunteer data'
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
      assigned: reports.filter((r) => r.status === 'assigned').length,
      inProgress: reports.filter((r) => r.status === 'in-progress').length,
      resolved: reports.filter((r) => r.status === 'resolved').length,
      availableCount: availableTasks.length,
      pendingRequests: myRequests.filter((r) => r.status === 'pending').length,
      pendingInvites: myInvitations.filter((i) => i.status === 'pending').length,
    }),
    [reports, availableTasks, myRequests, myInvitations]
  );

  const visibleReports = useMemo(() => {
    const term = search.trim().toLowerCase();

    return reports.filter((report) => {
      const matchesStatus = filter === 'all' || report.status === filter;
      const searchableValues = [
        report.title,
        report.description,
        report.category,
        report.address,
      ];

      const matchesSearch =
        !term ||
        searchableValues.some((value) =>
          String(value || '').toLowerCase().includes(term)
        );

      return matchesStatus && matchesSearch;
    });
  }, [reports, filter, search]);

  const visibleAvailableTasks = useMemo(() => {
    const term = search.trim().toLowerCase();
    return availableTasks.filter((task) => {
      if (!term) return true;
      const searchable = [task.title, task.description, task.category, task.address];
      return searchable.some((val) => String(val || '').toLowerCase().includes(term));
    });
  }, [availableTasks, search]);

  const toggleAvailability = async () => {
    if (availabilityLoading) return;
    setAvailabilityLoading(true);

    const nextState = !user?.isAvailable;

    try {
      const response = await api.patch('/users/me/availability', {
        isAvailable: nextState,
      });

      if (response.data?.user) {
        updateUser(response.data.user);
      } else {
        updateUser({ isAvailable: nextState });
      }

      toast.success(
        nextState
          ? 'You are now marked available for new tasks'
          : 'You are now marked unavailable for new assignments'
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to update availability status'
      );
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const updateStatus = async (report, status) => {
    if (busyId) return;

    const note = (notes[report._id] || '').trim();

    if (status === 'resolved' && !note) {
      toast.error('Enter a resolution note before resolving the task');
      return;
    }

    if (status === 'resolved' && note.length > 500) {
      toast.error('Resolution note cannot exceed 500 characters');
      return;
    }

    setBusyId(report._id);

    try {
      const response = await api.patch(
        `/reports/${report._id}/status`,
        { status, note }
      );

      const updatedReport = response.data?.report;

      setReports((prev) =>
        prev.map((item) => {
          if (item._id !== report._id) return item;
          return updatedReport
            ? { ...item, ...updatedReport }
            : {
                ...item,
                status,
                ...(status === 'resolved'
                  ? {
                      resolutionNote: note,
                      resolvedAt: new Date().toISOString(),
                    }
                  : {}),
              };
        })
      );

      if (status === 'resolved') {
        setResolvingId('');
        setNotes((prev) => ({ ...prev, [report._id]: '' }));
      }

      toast.success(`Task marked as ${formatStatus(status).toLowerCase()}`);
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Unable to update task status'
      );
    } finally {
      setBusyId('');
    }
  };

  // Request Assignment Handler
  const handleOpenRequest = (task) => {
    if (!user?.isAvailable) {
      toast.error('You must mark yourself available in your profile before requesting tasks.');
      return;
    }
    setRequestingReport(task);
    setRequestNote('');
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!requestingReport || submittingRequest) return;

    setSubmittingRequest(true);
    try {
      const response = await api.post(`/team/request/${requestingReport._id}`, {
        note: requestNote.trim(),
      });
      toast.success(response.data.message || 'Request submitted successfully!');

      // Update state locally
      setAvailableTasks((prev) =>
        prev.map((t) =>
          t._id === requestingReport._id ? { ...t, myRequestStatus: 'pending' } : t
        )
      );
      if (response.data.request) {
        setMyRequests((prev) => [
          { ...response.data.request, report: requestingReport },
          ...prev,
        ]);
      }
      setRequestingReport(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleCancelRequest = async (requestId) => {
    try {
      await api.patch(`/team/request/${requestId}/cancel`);
      setMyRequests((prev) =>
        prev.map((r) => (r._id === requestId ? { ...r, status: 'cancelled' } : r))
      );
      toast.success('Assignment request cancelled.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel request');
    }
  };

  const handleRespondInvitation = async (invitationId, action) => {
    try {
      const response = await api.post(`/team/invitation/${invitationId}/respond`, {
        action,
      });
      toast.success(response.data.message);

      setMyInvitations((prev) =>
        prev.map((inv) =>
          inv._id === invitationId
            ? { ...inv, status: action === 'accept' ? 'accepted' : 'declined' }
            : inv
        )
      );

      // If accepted, reload assigned reports to show the new workspace
      if (action === 'accept') {
        loadAllData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to respond to invitation');
    }
  };

  return (
    <div className="volunteer-page">
      <Navbar />

      <main className="volunteer-dashboard">
        <header className="volunteer-header">
          <div className="volunteer-header-copy">
            <span className="volunteer-eyebrow">
              <span aria-hidden="true">★</span> Volunteer Operations
            </span>
            <h1>Volunteer Task Console</h1>
            <p className="volunteer-header-description">
              Browse available community opportunities, coordinate in private team workspaces, and resolve local issues.
            </p>
          </div>

          <div className="volunteer-header-actions">
            <button
              type="button"
              onClick={toggleAvailability}
              disabled={availabilityLoading}
              className={`btn btn-sm ${user?.isAvailable ? 'btn-secondary' : 'btn-outline'}`}
              title="Toggle dispatch availability"
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: user?.isAvailable ? 'var(--color-success)' : '#9BA39D',
                  marginRight: '6px',
                }}
              />
              {availabilityLoading
                ? 'Updating...'
                : user?.isAvailable
                  ? 'Status: Available for Tasks'
                  : 'Status: Unavailable (Paused)'}
            </button>

            <button
              type="button"
              onClick={() => loadAllData(true)}
              disabled={refreshing || loading}
              className="btn btn-sm btn-outline"
            >
              {refreshing ? 'Refreshing...' : '↻ Refresh'}
            </button>
          </div>
        </header>

        {/* 4 Summary Stat Cards */}
        <section className="volunteer-stats" aria-label="Volunteer metrics">
          <article className="volunteer-stat-card">
            <div className="volunteer-stat-header">
              <span className="volunteer-stat-label">Available Tasks</span>
              <span className="volunteer-stat-icon">🔍</span>
            </div>
            <p className="volunteer-stat-value" style={{ color: 'var(--color-primary)' }}>
              {counts.availableCount}
            </p>
            <p className="volunteer-stat-note">Open in community</p>
          </article>

          <article className="volunteer-stat-card">
            <div className="volunteer-stat-header">
              <span className="volunteer-stat-label">My Assignments</span>
              <span className="volunteer-stat-icon">📋</span>
            </div>
            <p className="volunteer-stat-value" style={{ color: '#593A8B' }}>
              {counts.assigned + counts.inProgress}
            </p>
            <p className="volunteer-stat-note">Active single & team tasks</p>
          </article>

          <article className="volunteer-stat-card">
            <div className="volunteer-stat-header">
              <span className="volunteer-stat-label">Team Invites</span>
              <span className="volunteer-stat-icon">✉️</span>
            </div>
            <p
              className="volunteer-stat-value"
              style={{ color: counts.pendingInvites > 0 ? '#B83A3A' : 'var(--color-accent)' }}
            >
              {counts.pendingInvites}
            </p>
            <p className="volunteer-stat-note">Pending your response</p>
          </article>

          <article className="volunteer-stat-card">
            <div className="volunteer-stat-header">
              <span className="volunteer-stat-label">Completed</span>
              <span className="volunteer-stat-icon">✓</span>
            </div>
            <p className="volunteer-stat-value" style={{ color: 'var(--color-success)' }}>
              {counts.resolved}
            </p>
            <p className="volunteer-stat-note">Successfully verified</p>
          </article>
        </section>

        {/* Console Navigation Tabs */}
        <div className="team-tabs" style={{ marginBottom: '24px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('assigned')}
            className={`team-tab-btn ${activeTab === 'assigned' ? 'active' : ''}`}
          >
            📋 My Assigned & Teams ({reports.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('available')}
            className={`team-tab-btn ${activeTab === 'available' ? 'active' : ''}`}
          >
            🔍 Available Community Tasks ({availableTasks.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('invitations')}
            className={`team-tab-btn ${activeTab === 'invitations' ? 'active' : ''}`}
          >
            ✉️ Team Invitations
            {counts.pendingInvites > 0 && (
              <span className="team-tab-count" style={{ background: '#B83A3A' }}>
                {counts.pendingInvites}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`team-tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
          >
            📝 My Requests ({myRequests.length})
          </button>
        </div>

        {/* SECTION 1: MY ASSIGNED & TEAMS */}
        {activeTab === 'assigned' && (
          <div>
            <div className="volunteer-filter-bar">
              <div className="volunteer-search-box">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter tasks by title, category, citizen notes, or address..."
                  className="search-input"
                />
              </div>

              <div className="volunteer-filter-pills">
                {STATUS_OPTIONS.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFilter(status)}
                    className={`filter-pill ${filter === status ? 'active' : ''}`}
                  >
                    {status === 'all' ? 'All Assigned' : formatStatus(status)}
                  </button>
                ))}
              </div>
            </div>

            <section className="volunteer-section">
              {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <div className="loading-spinner" style={{ margin: '0 auto 16px' }} />
                  <p className="text-muted">Loading assigned volunteer tasks...</p>
                </div>
              ) : loadError ? (
                <div className="empty-state">
                  <div className="empty-state-icon">⚠️</div>
                  <h3>Unable to load assigned tasks</h3>
                  <button
                    type="button"
                    onClick={() => loadAllData(true)}
                    className="btn btn-primary"
                    style={{ marginTop: '16px' }}
                  >
                    Try Again
                  </button>
                </div>
              ) : visibleReports.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">🎉</div>
                  <h3>No tasks currently assigned</h3>
                  <p>
                    Check the <strong>Available Community Tasks</strong> tab above to view open issues and request assignment!
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('available')}
                    className="btn btn-primary"
                    style={{ marginTop: '16px' }}
                  >
                    Browse Available Tasks →
                  </button>
                </div>
              ) : (
                <div className="volunteer-tasks-grid">
                  {visibleReports.map((report) => (
                    <article key={report._id} className="volunteer-task-card">
                      <div>
                        <div className="task-card-top">
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span className="task-category-pill">
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
                            {report.assignmentType === 'team' && (
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  background: '#E8F0EA',
                                  color: 'var(--color-primary)',
                                  padding: '2px 8px',
                                  borderRadius: '999px',
                                  border: '1px solid rgba(36,72,61,0.2)',
                                }}
                              >
                                👥 Team Task ({report.teamMembers?.length || 1}/{report.requiredTeamSize || 5})
                              </span>
                            )}
                          </div>
                          <span className={`status-badge status-${report.status}`}>
                            {formatStatus(report.status)}
                          </span>
                        </div>

                        <Link to={`/reports/${report._id}`} className="task-title-link">
                          <h3 className="task-title">{report.title}</h3>
                        </Link>

                        <p className="task-description">{report.description}</p>

                        <div className="task-info-rows">
                          <div className="task-info-row">
                            <span className="info-label">📍 Location:</span>
                            <span className="info-val">{report.address || 'GPS coordinates on map'}</span>
                          </div>
                          <div className="task-info-row">
                            <span className="info-label">👤 Reporter:</span>
                            <span className="info-val">{report.reporter?.name || 'Local Resident'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Task Actions */}
                      <div className="task-card-actions">
                        {/* If team task: direct button to private workspace */}
                        <Link
                          to={`/reports/${report._id}/workspace`}
                          className="btn btn-sm btn-secondary"
                          style={{ width: '100%', marginBottom: '8px' }}
                        >
                          🚀 Enter Team Workspace & Chat
                        </Link>

                        {report.status === 'assigned' && (
                          <button
                            type="button"
                            disabled={busyId === report._id}
                            onClick={() => updateStatus(report, 'in-progress')}
                            className="btn btn-sm btn-primary"
                            style={{ width: '100%' }}
                          >
                            {busyId === report._id ? 'Updating...' : '⚡ Mark In-Progress'}
                          </button>
                        )}

                        {report.status === 'in-progress' && resolvingId !== report._id && (
                          <button
                            type="button"
                            onClick={() => setResolvingId(report._id)}
                            className="btn btn-sm btn-gold"
                            style={{ width: '100%' }}
                          >
                            ✓ Mark as Resolved
                          </button>
                        )}

                        {resolvingId === report._id && (
                          <div className="task-resolve-form" style={{ marginTop: '12px' }}>
                            <textarea
                              rows={3}
                              value={notes[report._id] || ''}
                              onChange={(e) =>
                                setNotes((prev) => ({
                                  ...prev,
                                  [report._id]: e.target.value,
                                }))
                              }
                              placeholder="Describe the completed resolution work..."
                              className="form-control"
                              style={{ width: '100%', marginBottom: '8px' }}
                            />
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                disabled={busyId === report._id}
                                onClick={() => updateStatus(report, 'resolved')}
                                className="btn btn-sm btn-primary"
                                style={{ flex: 1 }}
                              >
                                {busyId === report._id ? 'Saving...' : 'Submit Resolution'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setResolvingId('')}
                                className="btn btn-sm btn-outline"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* SECTION 2: AVAILABLE COMMUNITY TASKS */}
        {activeTab === 'available' && (
          <section className="volunteer-section">
            <div className="volunteer-filter-bar">
              <div className="volunteer-search-box" style={{ width: '100%' }}>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search available tasks by title, description, or address..."
                  className="search-input"
                />
              </div>
            </div>

            {visibleAvailableTasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <h3>No community tasks currently available</h3>
                <p>All open reports are either assigned or resolved. Check back soon!</p>
              </div>
            ) : (
              <div className="volunteer-tasks-grid">
                {visibleAvailableTasks.map((task) => (
                  <article key={task._id} className="volunteer-task-card">
                    <div>
                      <div className="task-card-top">
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span className="task-category-pill">
                            {formatCategory(task.category)}
                          </span>
                          {task.priority && (
                            <span className={`priority-badge priority-${task.priority}`}>
                              {task.priority === 'urgent' && '🚨 Urgent'}
                              {task.priority === 'high' && '⚠️ High'}
                              {task.priority === 'medium' && '⏺ Medium'}
                              {task.priority === 'low' && '⚪ Low'}
                            </span>
                          )}
                          {task.assignmentType === 'team' && (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                background: '#E8F0EA',
                                color: 'var(--color-primary)',
                                padding: '2px 8px',
                                borderRadius: '999px',
                              }}
                            >
                              Team ({task.teamMembers?.length || 0}/{task.requiredTeamSize || 5})
                            </span>
                          )}
                        </div>
                        <span className={`status-badge status-${task.status}`}>
                          {formatStatus(task.status)}
                        </span>
                      </div>

                      <Link to={`/reports/${task._id}`} className="task-title-link">
                        <h3 className="task-title">{task.title}</h3>
                      </Link>

                      <p className="task-description">{task.description}</p>

                      <div className="task-info-rows">
                        <div className="task-info-row">
                          <span className="info-label">📍 Location:</span>
                          <span className="info-val">{task.address || 'Geo-coordinates logged'}</span>
                        </div>
                        {task.distanceKm !== null && (
                          <div className="task-info-row">
                            <span className="info-label">📏 Distance:</span>
                            <span className="info-val" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                              {task.distanceKm} km away
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="task-card-actions">
                      {task.isMember || task.isAssigned ? (
                        <Link
                          to={`/reports/${task._id}/workspace`}
                          className="btn btn-sm btn-secondary"
                          style={{ width: '100%' }}
                        >
                          🚀 Open Team Workspace
                        </Link>
                      ) : task.myRequestStatus === 'pending' ? (
                        <button
                          type="button"
                          disabled
                          className="btn btn-sm btn-outline"
                          style={{ width: '100%', opacity: 0.8 }}
                        >
                          ⏳ Request Pending Review
                        </button>
                      ) : task.myInviteStatus === 'pending' ? (
                        <button
                          type="button"
                          onClick={() => setActiveTab('invitations')}
                          className="btn btn-sm btn-gold"
                          style={{ width: '100%' }}
                        >
                          ✉️ You have an invite! View
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenRequest(task)}
                          className="btn btn-sm btn-primary"
                          style={{ width: '100%' }}
                        >
                          + Request Assignment
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* SECTION 3: TEAM INVITATIONS */}
        {activeTab === 'invitations' && (
          <section className="volunteer-section">
            {myInvitations.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">✉️</div>
                <h3>No team invitations</h3>
                <p>When administrators or team coordinators invite you to nearby community tasks, invitations will appear here.</p>
              </div>
            ) : (
              <div className="volunteer-tasks-grid">
                {myInvitations.map((inv) => (
                  <article key={inv._id} className="volunteer-task-card">
                    <div>
                      <div className="task-card-top">
                        <span className="task-category-pill">
                          {formatCategory(inv.report?.category)}
                        </span>
                        <span className={`status-badge status-${inv.status}`}>
                          {inv.status === 'pending' ? 'Needs Response' : formatStatus(inv.status)}
                        </span>
                      </div>

                      <h3 className="task-title">{inv.report?.title || 'Community Task'}</h3>
                      <p className="task-description">
                        You have been invited by <strong>{inv.invitedBy?.name || 'Task Coordinator'}</strong> to join this volunteer team.
                      </p>

                      <div className="task-info-rows">
                        <div className="task-info-row">
                          <span className="info-label">📍 Location:</span>
                          <span className="info-val">{inv.report?.address || 'Community site'}</span>
                        </div>
                        {inv.distanceKm !== null && (
                          <div className="task-info-row">
                            <span className="info-label">📏 Distance:</span>
                            <span className="info-val">{inv.distanceKm} km away</span>
                          </div>
                        )}
                        <div className="task-info-row">
                          <span className="info-label">👥 Team Size:</span>
                          <span className="info-val">
                            {inv.report?.teamMembers?.length || 0} / {inv.report?.requiredTeamSize || 5} Confirmed
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="task-card-actions">
                      {inv.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleRespondInvitation(inv._id, 'accept')}
                            className="btn btn-sm btn-primary"
                            style={{ flex: 1 }}
                          >
                            ✓ Accept & Join
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRespondInvitation(inv._id, 'decline')}
                            className="btn btn-sm btn-outline"
                            style={{ flex: 1 }}
                          >
                            ✕ Decline
                          </button>
                        </div>
                      ) : inv.status === 'accepted' ? (
                        <Link
                          to={`/reports/${inv.report?._id}/workspace`}
                          className="btn btn-sm btn-secondary"
                          style={{ width: '100%' }}
                        >
                          🚀 Open Team Workspace
                        </Link>
                      ) : (
                        <span style={{ fontSize: '13px', color: 'var(--color-secondary)' }}>
                          Status: {formatStatus(inv.status)}
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* SECTION 4: MY REQUESTS */}
        {activeTab === 'requests' && (
          <section className="volunteer-section">
            {myRequests.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📝</div>
                <h3>No assignment requests</h3>
                <p>You haven't requested assignment on any community tasks yet.</p>
              </div>
            ) : (
              <div className="volunteer-tasks-grid">
                {myRequests.map((req) => (
                  <article key={req._id} className="volunteer-task-card">
                    <div>
                      <div className="task-card-top">
                        <span className="task-category-pill">
                          {formatCategory(req.report?.category)}
                        </span>
                        <span className={`status-badge status-${req.status}`}>
                          {formatStatus(req.status)}
                        </span>
                      </div>

                      <h3 className="task-title">{req.report?.title || 'Community Task'}</h3>
                      {req.note && (
                        <p className="task-description">
                          <strong>Your Note:</strong> "{req.note}"
                        </p>
                      )}

                      <div className="task-info-rows">
                        <div className="task-info-row">
                          <span className="info-label">📍 Location:</span>
                          <span className="info-val">{req.report?.address || 'Site on map'}</span>
                        </div>
                        <div className="task-info-row">
                          <span className="info-label">📅 Requested:</span>
                          <span className="info-val">{new Date(req.createdAt).toLocaleDateString()}</span>
                        </div>
                        {req.reviewNote && (
                          <div className="task-info-row">
                            <span className="info-label">💬 Review Note:</span>
                            <span className="info-val">{req.reviewNote}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="task-card-actions">
                      {req.status === 'pending' ? (
                        <button
                          type="button"
                          onClick={() => handleCancelRequest(req._id)}
                          className="btn btn-sm btn-outline"
                          style={{ width: '100%' }}
                        >
                          ✕ Cancel Request
                        </button>
                      ) : req.status === 'approved' ? (
                        <Link
                          to={`/reports/${req.report?._id}/workspace`}
                          className="btn btn-sm btn-secondary"
                          style={{ width: '100%' }}
                        >
                          🚀 Open Team Workspace
                        </Link>
                      ) : (
                        <span style={{ fontSize: '13px', color: 'var(--color-secondary)' }}>
                          Status: {formatStatus(req.status)}
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Request Assignment Modal */}
        {requestingReport && (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              backgroundColor: 'rgba(30, 24, 22, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              backdropFilter: 'blur(4px)',
            }}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                padding: '32px',
                maxWidth: '500px',
                width: '100%',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem' }}>
                Request Task Assignment
              </h3>
              <p style={{ margin: '0 0 16px', color: 'var(--color-secondary)', fontSize: '14px' }}>
                Express your interest to work on <strong>"{requestingReport.title}"</strong>. The coordinator or administrator will review your availability and assign you.
              </p>

              <form onSubmit={handleSubmitRequest}>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label htmlFor="req-note" style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>
                    Note / Availability details (Optional)
                  </label>
                  <textarea
                    id="req-note"
                    rows={3}
                    value={requestNote}
                    onChange={(e) => setRequestNote(e.target.value)}
                    placeholder="E.g., I have tools ready and can attend this Saturday morning..."
                    className="form-control"
                    disabled={submittingRequest}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setRequestingReport(null)}
                    disabled={submittingRequest}
                    className="btn btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRequest}
                    className="btn btn-primary"
                  >
                    {submittingRequest ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
