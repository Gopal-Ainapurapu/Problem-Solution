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

  // Field Assessment & Reinforcement Request State
  const [reinforceReport, setReinforceReport] = useState(null);
  const [assessmentNote, setAssessmentNote] = useState('');
  const [additionalVolunteers, setAdditionalVolunteers] = useState(2);
  const [nearbyCandidates, setNearbyCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);
  const [submittingReinforce, setSubmittingReinforce] = useState(false);

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

  const openReinforceModal = async (report) => {
    setReinforceReport(report);
    setAssessmentNote('');
    setAdditionalVolunteers(2);
    setSelectedCandidateIds([]);
    setLoadingCandidates(true);

    try {
      const res = await api.get(`/team/eligible-volunteers/${report._id}`);
      setNearbyCandidates(res.data?.volunteers || []);
    } catch {
      setNearbyCandidates([]);
    } finally {
      setLoadingCandidates(false);
    }
  };

  const toggleCandidateSelection = (volId) => {
    setSelectedCandidateIds((prev) =>
      prev.includes(volId) ? prev.filter((id) => id !== volId) : [...prev, volId]
    );
  };

  const handleSubmitReinforce = async (e) => {
    e.preventDefault();
    if (!reinforceReport) return;

    if (!assessmentNote.trim() || assessmentNote.trim().length < 5) {
      toast.error('Please enter an assessment note describing why reinforcements are needed.');
      return;
    }

    setSubmittingReinforce(true);

    try {
      const response = await api.post(
        `/team/request-reinforcements/${reinforceReport._id}`,
        {
          assessmentNote: assessmentNote.trim(),
          additionalMembersNeeded: Number(additionalVolunteers) || 2,
          volunteerIds: selectedCandidateIds,
        }
      );

      toast.success(
        response.data?.message ||
          'Reinforcements requested successfully! You remain lead coordinator.'
      );
      setReinforceReport(null);
      loadAllData(true);
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Failed to submit reinforcement request.'
      );
    } finally {
      setSubmittingReinforce(false);
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

                        {/* Request Reinforcements Button */}
                        {report.status !== 'resolved' && (
                          <button
                            type="button"
                            onClick={() => openReinforceModal(report)}
                            className="btn btn-sm btn-outline"
                            style={{ width: '100%', marginBottom: '8px', fontSize: '12px' }}
                          >
                            📢 Assess On-Site & Recruit Additional Help
                          </button>
                        )}

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
        {/* Volunteer Field Assessment & Additional Volunteers Modal */}
        {reinforceReport && (
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
                maxWidth: '640px',
                width: '100%',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
                overflow: 'hidden',
              }}
            >
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
                    On-Site Assessment & Team Expansion
                  </span>
                  <h3 style={{ margin: '4px 0 2px', fontSize: '1.25rem' }}>
                    Request Help & Recruit Nearby Volunteers
                  </h3>
                  <p style={{ margin: 0, color: 'var(--color-secondary)', fontSize: '13px' }}>
                    "{reinforceReport.title}"
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReinforceReport(null)}
                  disabled={submittingReinforce}
                  className="btn btn-outline"
                  style={{ padding: '6px 10px', fontSize: '14px', borderRadius: '50%' }}
                >
                  ✕
                </button>
              </header>

              <form onSubmit={handleSubmitReinforce} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
                  {/* Lead Ownership Banner */}
                  <div
                    style={{
                      background: '#f3f7f4',
                      border: '1.5px solid #287A52',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>👑</span>
                    <div>
                      <strong style={{ display: 'block', color: 'var(--color-primary)', fontSize: '13px', marginBottom: '2px' }}>
                        Lead Volunteer Ownership Maintained
                      </strong>
                      <span style={{ fontSize: '12px', color: 'var(--color-secondary)', lineHeight: 1.4 }}>
                        You will remain the lead coordinator and retain full ownership of this report. Additional recruited volunteers will join as team members to assist with on-site resolution.
                      </span>
                    </div>
                  </div>

                  {/* Situation Assessment Note */}
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label htmlFor="assess-note" style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '13px' }}>
                      On-Site Assessment Note *
                    </label>
                    <textarea
                      id="assess-note"
                      rows={3}
                      required
                      minLength={5}
                      maxLength={1000}
                      value={assessmentNote}
                      onChange={(e) => setAssessmentNote(e.target.value)}
                      placeholder="Describe the situation on-site: physical hazard scale, tools needed, or why reinforcements are required..."
                      className="form-control"
                      disabled={submittingReinforce}
                    />
                    <span className="form-help">This note is recorded in the report history and team workspace.</span>
                  </div>

                  {/* Additional Members Needed */}
                  <div
                    style={{
                      background: 'var(--color-background)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      marginBottom: '18px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <label htmlFor="reinforce-count" style={{ fontWeight: 700, fontSize: '13px', display: 'block' }}>
                        Additional Teammates Needed:
                      </label>
                      <span style={{ fontSize: '12px', color: 'var(--color-secondary)' }}>
                        Currently confirmed: {reinforceReport.teamMembers?.length || 1} member(s)
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        id="reinforce-count"
                        type="number"
                        min={1}
                        max={15}
                        value={additionalVolunteers}
                        onChange={(e) => setAdditionalVolunteers(Math.max(1, Math.min(15, Number(e.target.value))))}
                        className="form-control"
                        style={{ width: '80px', textAlign: 'center', fontWeight: 700 }}
                        disabled={submittingReinforce}
                      />
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>volunteers</span>
                    </div>
                  </div>

                  {/* Nearby Volunteers Geospatial Section */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <label style={{ fontWeight: 700, fontSize: '13px' }}>
                        Nearby Available Volunteers ({nearbyCandidates.length})
                      </label>
                      <span style={{ fontSize: '11.5px', color: 'var(--color-secondary)' }}>
                        Select candidates to invite immediately
                      </span>
                    </div>

                    {loadingCandidates ? (
                      <div style={{ textAlign: 'center', padding: '24px' }}>
                        <div className="loading-spinner" style={{ margin: '0 auto 8px' }} />
                        <p style={{ fontSize: '12px', color: 'var(--color-secondary)' }}>
                          Scanning volunteers near incident coordinates...
                        </p>
                      </div>
                    ) : nearbyCandidates.length === 0 ? (
                      <div style={{ padding: '16px', background: 'var(--color-background)', borderRadius: '8px', textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--color-secondary)' }}>
                          No nearby available volunteers currently detected. You can still submit this request to open the vacancy on the public volunteer console!
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                        {nearbyCandidates.map((vol) => {
                          const isSelected = selectedCandidateIds.includes(vol._id);
                          return (
                            <div
                              key={vol._id}
                              onClick={() => toggleCandidateSelection(vol._id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: `1.5px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                background: isSelected ? 'var(--color-surface-hover, #f3f7f4)' : '#ffffff',
                                cursor: 'pointer',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  style={{ cursor: 'pointer' }}
                                />
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: '13px' }}>{vol.name}</div>
                                  <div style={{ fontSize: '11.5px', color: 'var(--color-secondary)' }}>
                                    {vol.skills?.slice(0, 3).join(', ') || 'General volunteer'}
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {vol.distanceKm !== null && (
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      background: '#e8f0ea',
                                      color: 'var(--color-primary)',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                    }}
                                  >
                                    📍 {vol.distanceKm} km
                                  </span>
                                )}
                                <span style={{ fontSize: '11px', color: vol.isAvailable ? 'var(--color-success)' : 'var(--color-muted)' }}>
                                  {vol.isAvailable ? '● Available' : '○ Busy'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

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
                  <span style={{ fontSize: '12.5px', color: 'var(--color-secondary)' }}>
                    Inviting: <strong>{selectedCandidateIds.length}</strong> candidate(s)
                  </span>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setReinforceReport(null)}
                      disabled={submittingReinforce}
                      className="btn btn-outline"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submittingReinforce || !assessmentNote.trim()}
                      className="btn btn-primary"
                    >
                      {submittingReinforce ? 'Submitting Assessment...' : 'Submit Assessment & Recruit Help →'}
                    </button>
                  </div>
                </footer>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
