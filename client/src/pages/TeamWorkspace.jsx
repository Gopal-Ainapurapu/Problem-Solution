import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import api from '../api';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import './TeamWorkspace.css';

const getSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    return apiUrl.replace(/\/api\/?$/, '');
  }
  return 'http://localhost:5001';
};

const formatCategory = (category) => {
  if (!category) return 'Other';
  return category
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatStatus = (status) => {
  if (!status) return 'Unknown';
  return status
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function TeamWorkspace() {
  const { id } = useParams();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'tasks' | 'roster' | 'completion'
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Chat state
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const chatBottomRef = useRef(null);
  const socketRef = useRef(null);

  // Subtask state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  // Completion state
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionImage, setCompletionImage] = useState('');
  const [completionImages, setCompletionImages] = useState([]);
  const [submittingCompletion, setSubmittingCompletion] = useState(false);

  // Review state
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const [wsRes, msgRes] = await Promise.all([
          api.get(`/team/workspace/${id}`),
          api.get(`/team/workspace/${id}/messages`),
        ]);
        if (!ignore) {
          setWorkspace(wsRes.data);
          setMessages(msgRes.data.messages || []);
          setErrorMsg('');
        }
      } catch (err) {
        if (!ignore) {
          setErrorMsg(
            err.response?.data?.message ||
              'Access Denied: You must be a confirmed team member or coordinator to enter this workspace.'
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [id]);

  // Socket.io Setup for Private Team Room
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !id) return undefined;

    const socketUrl = getSocketUrl();
    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.emit('join_team', { reportId: id, token });

    socket.on('new_team_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('team_tasks_updated', ({ teamTasks }) => {
      setWorkspace((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          report: {
            ...prev.report,
            teamTasks,
          },
        };
      });
    });

    socket.on('team_completion_submitted', ({ completionReport }) => {
      setWorkspace((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          report: {
            ...prev.report,
            completionReport,
          },
        };
      });
      toast.success('Team member submitted completion evidence for review!');
    });

    socket.on('team_completion_reviewed', ({ approved, report }) => {
      setWorkspace((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          report: {
            ...prev.report,
            status: report.status,
            completionReport: report.completionReport,
          },
        };
      });
      toast.success(
        approved
          ? '🎉 Task completion approved! Report is marked resolved.'
          : 'Task completion review completed.'
      );
    });

    socket.on('team_unauthorized', (data) => {
      setErrorMsg(data.message || 'Unauthorized to access team room.');
    });

    return () => {
      socket.emit('leave_team', { reportId: id });
      socket.disconnect();
    };
  }, [id]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (activeTab === 'chat' && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || sendingMsg) return;

    setSendingMsg(true);
    const content = messageText.trim();
    setMessageText('');

    try {
      const response = await api.post(`/team/workspace/${id}/messages`, {
        content,
      });
      // Fallback add if socket didn't append yet
      setMessages((prev) => {
        if (prev.some((m) => m._id === response.data.message._id)) return prev;
        return [...prev, response.data.message];
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message');
      setMessageText(content);
    } finally {
      setSendingMsg(false);
    }
  };

  const handleToggleTask = async (taskId, currentCompleted) => {
    try {
      const response = await api.patch(`/team/workspace/${id}/tasks`, {
        action: 'toggle',
        taskId,
        completed: !currentCompleted,
      });
      setWorkspace((prev) => ({
        ...prev,
        report: { ...prev.report, teamTasks: response.data.teamTasks },
      }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update task');
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || addingTask) return;

    setAddingTask(true);
    try {
      const response = await api.patch(`/team/workspace/${id}/tasks`, {
        action: 'add',
        title: newTaskTitle.trim(),
      });
      setWorkspace((prev) => ({
        ...prev,
        report: { ...prev.report, teamTasks: response.data.teamTasks },
      }));
      setNewTaskTitle('');
      toast.success('Task checklist item added.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add task');
    } finally {
      setAddingTask(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      const response = await api.patch(`/team/workspace/${id}/tasks`, {
        action: 'delete',
        taskId,
      });
      setWorkspace((prev) => ({
        ...prev,
        report: { ...prev.report, teamTasks: response.data.teamTasks },
      }));
      toast.success('Task removed.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove task');
    }
  };

  const handleAddImage = () => {
    if (!completionImage.trim()) return;
    setCompletionImages((prev) => [...prev, completionImage.trim()]);
    setCompletionImage('');
  };

  const handleSubmitCompletion = async (e) => {
    e.preventDefault();
    if (!completionNotes.trim() || submittingCompletion) return;

    setSubmittingCompletion(true);
    try {
      const response = await api.post(`/team/workspace/${id}/complete`, {
        notes: completionNotes.trim(),
        images: completionImages,
      });
      setWorkspace((prev) => ({
        ...prev,
        report: {
          ...prev.report,
          completionReport: response.data.completionReport,
        },
      }));
      toast.success('Task completion evidence submitted for review!');
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Failed to submit completion report'
      );
    } finally {
      setSubmittingCompletion(false);
    }
  };

  const handleReviewCompletion = async (approved) => {
    setReviewing(true);
    try {
      const response = await api.post(
        `/team/workspace/${id}/review-completion`,
        {
          approved,
          notes: reviewNotes.trim(),
        }
      );
      setWorkspace((prev) => ({
        ...prev,
        report: response.data.report,
      }));
      toast.success(response.data.message);
      setReviewNotes('');
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Failed to submit completion review'
      );
    } finally {
      setReviewing(false);
    }
  };

  if (loading) {
    return (
      <div className="team-page">
        <Navbar />
        <div style={{ textAlign: 'center', padding: '100px 20px' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 16px' }} />
          <p className="text-muted">Loading private team workspace...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !workspace) {
    return (
      <div className="team-page">
        <Navbar />
        <main className="team-container">
          <div className="empty-state" style={{ marginTop: '60px' }}>
            <div className="empty-state-icon">🔒</div>
            <h3>Private Team Workspace</h3>
            <p>
              {errorMsg ||
                'This space is restricted to confirmed members of this task team.'}
            </p>
            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
                marginTop: '20px',
              }}
            >
              <Link to="/volunteer" className="btn btn-primary">
                Return to Volunteer Console
              </Link>
              <Link to={`/reports/${id}`} className="btn btn-outline">
                View Public Report
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const { report, isCoordinator } = workspace;
  const confirmedCount = report.teamMembers?.length || 0;
  const requiredCount = report.requiredTeamSize || 1;
  const tasks = report.teamTasks || [];
  const completedTasksCount = tasks.filter((t) => t.completed).length;
  const progressPercent =
    tasks.length > 0
      ? Math.round((completedTasksCount / tasks.length) * 100)
      : 0;

  return (
    <div className="team-page">
      <Navbar />

      <main className="team-container">
        {/* Breadcrumb & Navigation */}
        <div className="team-breadcrumb">
          <Link to="/volunteer" className="team-back-link">
            ← Volunteer Console
          </Link>
          <span className="team-sep">/</span>
          <Link to={`/reports/${report._id}`} className="team-back-link">
            Report #{report._id.slice(-6)}
          </Link>
          <span className="team-sep">/</span>
          <span className="team-curr">Team Workspace</span>
        </div>

        {/* Workspace Header */}
        <header className="team-header-card">
          <div className="team-header-top">
            <div className="team-header-badges">
              <span className="citizen-card-category">
                {formatCategory(report.category)}
              </span>
              <span
                className={`priority-badge priority-${report.priority || 'medium'}`}
              >
                {report.priority === 'urgent' && '🚨 Urgent'}
                {report.priority === 'high' && '⚠️ High'}
                {report.priority === 'medium' && '⏺ Medium'}
                {report.priority === 'low' && '⚪ Low'}
              </span>
              <span
                className={`status-badge status-${report.status || 'assigned'}`}
              >
                {formatStatus(report.status)}
              </span>
            </div>

            <div className="team-user-role-badge">
              <span className="role-icon">🛡️</span>
              <span>
                Your Role:{' '}
                <strong>
                  {isCoordinator ? 'Team Coordinator' : 'Confirmed Member'}
                </strong>
              </span>
            </div>
          </div>

          <h1 className="team-title">{report.title}</h1>
          <p className="team-desc">{report.description}</p>

          <div className="team-metrics-strip">
            <div className="team-metric">
              <span className="metric-label">Team Capacity</span>
              <span className="metric-value">
                {confirmedCount} / {requiredCount} Members
              </span>
            </div>
            <div className="team-metric">
              <span className="metric-label">Location</span>
              <span
                className="metric-value"
                title={report.address || 'Report Coordinates'}
              >
                📍 {report.address || 'Field Location'}
              </span>
            </div>
            <div className="team-metric">
              <span className="metric-label">Recruitment</span>
              <span
                className="metric-value"
                style={{
                  color:
                    confirmedCount >= requiredCount
                      ? 'var(--color-success)'
                      : '#A96816',
                }}
              >
                {confirmedCount >= requiredCount
                  ? '✓ Team Full'
                  : 'Recruiting Active'}
              </span>
            </div>
            <div className="team-metric">
              <span className="metric-label">Checklist Progress</span>
              <span className="metric-value">
                {completedTasksCount} / {tasks.length} ({progressPercent}%)
              </span>
            </div>
          </div>
        </header>

        {/* Workspace Navigation Tabs */}
        <nav className="team-tabs" aria-label="Team workspace sections">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`team-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          >
            💬 Private Team Chat
            {messages.length > 0 && (
              <span className="team-tab-count">{messages.length}</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            className={`team-tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}
          >
            ☑ Coordination & Tasks
            {tasks.length > 0 && (
              <span className="team-tab-count">
                {completedTasksCount}/{tasks.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            className={`team-tab-btn ${activeTab === 'roster' ? 'active' : ''}`}
          >
            👥 Team Members ({confirmedCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('completion')}
            className={`team-tab-btn ${activeTab === 'completion' ? 'active' : ''}`}
          >
            📋 Evidence & Completion
            {report.completionReport?.reviewStatus === 'approved' && (
              <span className="team-tab-count" style={{ background: '#287A52' }}>
                ✓ Resolved
              </span>
            )}
          </button>
        </nav>

        {/* TAB 1: REAL-TIME TEAM CHAT */}
        {activeTab === 'chat' && (
          <section className="team-panel team-chat-panel">
            <div className="team-chat-header">
              <div>
                <h3>Team Communication Channel</h3>
                <p>
                  End-to-end authenticated private room dedicated to Report #
                  {report._id.slice(-6)}. Messages are strictly restricted to
                  confirmed members.
                </p>
              </div>
              <span className="chat-live-pill">● Socket Connected</span>
            </div>

            <div className="team-chat-messages">
              {messages.length === 0 ? (
                <div className="chat-empty">
                  <p>👋 No messages posted yet. Start coordinating with your team!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  if (msg.isSystem) {
                    return (
                      <div key={msg._id} className="chat-system-msg">
                        <span>{msg.content}</span>
                        <span className="chat-system-time">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    );
                  }

                  const isMe = msg.sender === user?.id || msg.sender === user?._id;

                  return (
                    <div
                      key={msg._id}
                      className={`chat-bubble-row ${isMe ? 'chat-me' : 'chat-other'}`}
                    >
                      {!isMe && (
                        <div className="chat-avatar">
                          {msg.senderName?.charAt(0).toUpperCase() || 'V'}
                        </div>
                      )}
                      <div className="chat-bubble">
                        <div className="chat-sender-header">
                          <span className="chat-sender-name">
                            {isMe ? 'You' : msg.senderName}
                          </span>
                          {msg.senderRole === 'coordinator' && (
                            <span className="chat-role-badge">Coordinator</span>
                          )}
                          <span className="chat-time">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="chat-text">{msg.content}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            <form onSubmit={handleSendMessage} className="team-chat-input-box">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type a message to your team members..."
                className="form-control"
                disabled={sendingMsg}
              />
              <button
                type="submit"
                disabled={sendingMsg || !messageText.trim()}
                className="btn btn-primary"
              >
                {sendingMsg ? 'Sending...' : 'Send'}
              </button>
            </form>
          </section>
        )}

        {/* TAB 2: TASKS & COORDINATION */}
        {activeTab === 'tasks' && (
          <section className="team-panel">
            <div className="team-panel-grid">
              {/* Checklist Column */}
              <div className="team-tasks-col">
                <div className="tasks-col-header">
                  <div>
                    <h3>Task Coordination Checklist</h3>
                    <p>
                      Track and check off subtasks required to resolve this
                      community issue.
                    </p>
                  </div>
                </div>

                <div className="task-progress-bar-wrap">
                  <div
                    className="task-progress-bar"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="task-checklist">
                  {tasks.length === 0 ? (
                    <div className="empty-subtasks">
                      No subtasks listed yet. Add items below to break down the
                      work.
                    </div>
                  ) : (
                    tasks.map((t) => (
                      <div
                        key={t._id}
                        className={`checklist-item ${t.completed ? 'completed' : ''}`}
                      >
                        <input
                          type="checkbox"
                          id={`task-${t._id}`}
                          checked={t.completed}
                          onChange={() => handleToggleTask(t._id, t.completed)}
                          className="checklist-checkbox"
                        />
                        <label
                          htmlFor={`task-${t._id}`}
                          className="checklist-label"
                        >
                          <span className="task-item-title">{t.title}</span>
                          {t.completed && (
                            <span className="task-item-meta">
                              ✓ Completed
                            </span>
                          )}
                        </label>
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(t._id)}
                          className="task-item-del-btn"
                          title="Delete subtask"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddTask} className="add-task-form">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Add a new coordination item (e.g., 'Clear blocked drain drainpipe')..."
                    className="form-control"
                    disabled={addingTask}
                  />
                  <button
                    type="submit"
                    disabled={addingTask || !newTaskTitle.trim()}
                    className="btn btn-secondary"
                  >
                    + Add Task
                  </button>
                </form>
              </div>

              {/* Meeting & Dispatch Logistics */}
              <div className="team-logistics-col">
                <div className="logistics-card">
                  <h4>📍 Meeting Point & Schedule</h4>
                  {report.meetingDetails?.location ? (
                    <>
                      <div className="logistic-row">
                        <span className="log-label">Meeting Location:</span>
                        <span className="log-val">
                          {report.meetingDetails.location}
                        </span>
                      </div>
                      {report.meetingDetails.scheduledDate && (
                        <div className="logistic-row">
                          <span className="log-label">Scheduled Date:</span>
                          <span className="log-val">
                            {new Date(
                              report.meetingDetails.scheduledDate
                            ).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {report.meetingDetails.instructions && (
                        <div className="logistic-row">
                          <span className="log-label">Coordinator Notes:</span>
                          <span className="log-val">
                            {report.meetingDetails.instructions}
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-muted" style={{ fontSize: '13px' }}>
                      No specific meeting point specified. Coordinate in the team
                      chat room to meet on site.
                    </p>
                  )}
                </div>

                <div className="logistics-card" style={{ marginTop: '16px' }}>
                  <h4>📞 Coordinator Dispatch Info</h4>
                  <div className="logistic-row">
                    <span className="log-label">Coordinator:</span>
                    <span className="log-val">
                      {report.teamCoordinator?.name || 'Administrator'}
                    </span>
                  </div>
                  {report.teamCoordinator?.email && (
                    <div className="logistic-row">
                      <span className="log-label">Email:</span>
                      <span className="log-val">
                        {report.teamCoordinator.email}
                      </span>
                    </div>
                  )}
                  {report.teamCoordinator?.phone && (
                    <div className="logistic-row">
                      <span className="log-label">Phone:</span>
                      <span className="log-val">
                        {report.teamCoordinator.phone}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB 3: TEAM MEMBERS DIRECTORY */}
        {activeTab === 'roster' && (
          <section className="team-panel">
            <div className="roster-header">
              <h3>Confirmed Team Roster ({confirmedCount} / {requiredCount})</h3>
              <p>
                List of confirmed community responders assigned to this task.
              </p>
            </div>

            <div className="roster-grid">
              {/* Coordinator Card */}
              {report.teamCoordinator && (
                <div className="roster-member-card coordinator-card">
                  <div className="member-avatar">
                    {(report.teamCoordinator.name || 'C').charAt(0).toUpperCase()}
                  </div>
                  <div className="member-info">
                    <h4>{report.teamCoordinator.name}</h4>
                    <span className="role-pill role-admin">Coordinator</span>
                    <p className="member-contact">
                      ✉ {report.teamCoordinator.email}
                    </p>
                  </div>
                </div>
              )}

              {/* Confirmed Members */}
              {(report.teamMembers || []).map((m, index) => (
                <div key={m.user?._id || index} className="roster-member-card">
                  <div className="member-avatar">
                    {(m.user?.name || 'V').charAt(0).toUpperCase()}
                  </div>
                  <div className="member-info">
                    <h4>{m.user?.name || 'Field Volunteer'}</h4>
                    <span
                      className={`role-pill ${m.role === 'lead' ? 'role-admin' : 'role-volunteer'}`}
                    >
                      {m.role === 'lead' ? 'Team Lead' : 'Field Responder'}
                    </span>
                    <p className="member-contact">
                      ✉ {m.user?.email || 'Confidential'}
                    </p>
                    <span className="member-joined">
                      Joined {new Date(m.joinedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TAB 4: COMPLETION EVIDENCE & REVIEW */}
        {activeTab === 'completion' && (
          <section className="team-panel">
            <div className="completion-layout">
              <div className="completion-form-col">
                <h3>Submit Completion Report</h3>
                <p>
                  When your team has resolved the issue on site, document your
                  work, describe what actions were taken, and attach photos as
                  evidence.
                </p>

                {report.completionReport?.reviewStatus ? (
                  <div
                    className={`completion-status-box status-${report.completionReport.reviewStatus}`}
                  >
                    <h4>
                      Review Status:{' '}
                      {report.completionReport.reviewStatus.toUpperCase()}
                    </h4>
                    <p>
                      <strong>Submitted Notes:</strong>{' '}
                      {report.completionReport.notes}
                    </p>
                    {report.completionReport.reviewNotes && (
                      <p style={{ marginTop: '8px' }}>
                        <strong>Coordinator Feedback:</strong>{' '}
                        {report.completionReport.reviewNotes}
                      </p>
                    )}
                    {Array.isArray(report.completionReport.images) &&
                      report.completionReport.images.length > 0 && (
                        <div
                          style={{
                            display: 'flex',
                            gap: '8px',
                            marginTop: '12px',
                          }}
                        >
                          {report.completionReport.images.map((img, i) => (
                            <img
                              key={i}
                              src={img}
                              alt="Evidence attachment"
                              style={{
                                width: '80px',
                                height: '80px',
                                objectFit: 'cover',
                                borderRadius: '6px',
                              }}
                            />
                          ))}
                        </div>
                      )}
                  </div>
                ) : null}

                {/* Submission Form */}
                {report.status !== 'resolved' && (
                  <form
                    onSubmit={handleSubmitCompletion}
                    className="completion-form"
                  >
                    <div className="form-group">
                      <label htmlFor="completion-notes">
                        Resolution Actions & Field Notes
                      </label>
                      <textarea
                        id="completion-notes"
                        rows={4}
                        required
                        value={completionNotes}
                        onChange={(e) => setCompletionNotes(e.target.value)}
                        placeholder="Describe the actions completed by the team (e.g. Cleared 2 bags of waste, unblocked storm drain, verified flow)..."
                        className="form-control"
                        disabled={submittingCompletion}
                      />
                    </div>

                    <div className="form-group">
                      <label>Photo Evidence URL</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="url"
                          value={completionImage}
                          onChange={(e) => setCompletionImage(e.target.value)}
                          placeholder="Paste image URL (https://...)"
                          className="form-control"
                          disabled={submittingCompletion}
                        />
                        <button
                          type="button"
                          onClick={handleAddImage}
                          className="btn btn-outline"
                        >
                          + Add Photo
                        </button>
                      </div>

                      {completionImages.length > 0 && (
                        <div
                          style={{
                            display: 'flex',
                            gap: '8px',
                            marginTop: '8px',
                          }}
                        >
                          {completionImages.map((img, idx) => (
                            <div
                              key={idx}
                              style={{
                                position: 'relative',
                                display: 'inline-block',
                              }}
                            >
                              <img
                                src={img}
                                alt="Evidence preview"
                                style={{
                                  width: '60px',
                                  height: '60px',
                                  objectFit: 'cover',
                                  borderRadius: '6px',
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={
                        submittingCompletion || !completionNotes.trim()
                      }
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                    >
                      {submittingCompletion
                        ? 'Submitting Evidence...'
                        : 'Submit Completion Evidence for Review'}
                    </button>
                  </form>
                )}
              </div>

              {/* Coordinator Review Actions */}
              {isCoordinator &&
                report.completionReport?.reviewStatus === 'pending' && (
                  <div className="completion-review-col">
                    <div className="coordinator-review-card">
                      <h4>🛡️ Coordinator Action Required</h4>
                      <p>
                        A team member has submitted evidence. Review the work
                        and decide whether to approve and resolve the report.
                      </p>

                      <div className="form-group">
                        <label htmlFor="coordinator-review-note">
                          Review Notes / Feedback
                        </label>
                        <textarea
                          id="coordinator-review-note"
                          rows={3}
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          placeholder="Optional feedback for the team..."
                          className="form-control"
                          disabled={reviewing}
                        />
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          gap: '12px',
                          marginTop: '16px',
                        }}
                      >
                        <button
                          type="button"
                          disabled={reviewing}
                          onClick={() => handleReviewCompletion(true)}
                          className="btn btn-primary"
                          style={{ flex: 1 }}
                        >
                          ✓ Approve & Resolve
                        </button>
                        <button
                          type="button"
                          disabled={reviewing}
                          onClick={() => handleReviewCompletion(false)}
                          className="btn btn-outline"
                          style={{ flex: 1 }}
                        >
                          ✕ Request Changes
                        </button>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
