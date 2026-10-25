import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import './ReportDetails.css';

const formatStatus = (status = 'unknown') =>
  status === 'in-progress'
    ? 'In Progress'
    : status.charAt(0).toUpperCase() + status.slice(1);

const formatDate = (date) => {
  if (!date) return 'Date unavailable';
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'Date unavailable';
  }
  return parsedDate.toLocaleString();
};

export default function ReportDetails() {
  const { id } = useParams();
  const { user } = useAuth();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(null);

  // Volunteer Request State
  const [requestNote, setRequestNote] = useState('');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);

  // Team Recruitment Modal State (for Admin/Coordinator)
  const [showRecruitModal, setShowRecruitModal] = useState(false);
  const [recruitTeamSize, setRecruitTeamSize] = useState(5);
  const [recruitRadius, setRecruitRadius] = useState(15);
  const [recruitDeadline, setRecruitDeadline] = useState('');
  const [recruitSkills, setRecruitSkills] = useState('');
  const [meetingLocation, setMeetingLocation] = useState('');
  const [meetingInstructions, setMeetingInstructions] = useState('');
  const [eligibleVolunteers, setEligibleVolunteers] = useState([]);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [savingRecruit, setSavingRecruit] = useState(false);
  const [invitedIds, setInvitedIds] = useState(new Set());

  useEffect(() => {
    let cancelled = false;

    const fetchReport = async () => {
      try {
        const response = await api.get(`/reports/${id}`);
        if (!cancelled) {
          setReport(response.data.report || response.data);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error.response?.data?.message || 'Unable to load report details'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchReport();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const fetchEligibleVolunteers = async () => {
    setLoadingEligible(true);
    try {
      const response = await api.get(`/team/eligible-volunteers/${id}`);
      setEligibleVolunteers(response.data.volunteers || []);
    } catch {
      toast.error('Unable to load nearby eligible volunteers');
    } finally {
      setLoadingEligible(false);
    }
  };

  const handleOpenRecruitModal = () => {
    setShowRecruitModal(true);
    if (report) {
      setRecruitTeamSize(report.requiredTeamSize || 5);
      setRecruitRadius(report.recruitmentRadiusKm || 15);
      setMeetingLocation(report.meetingDetails?.location || '');
      setMeetingInstructions(report.meetingDetails?.instructions || '');
      setRecruitSkills((report.requiredSkills || []).join(', '));
    }
    fetchEligibleVolunteers();
  };

  const handleSaveRecruitConfig = async (e) => {
    e.preventDefault();
    setSavingRecruit(true);

    try {
      const skillsArray = recruitSkills
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      const response = await api.post(`/team/configure/${id}`, {
        assignmentType: 'team',
        requiredTeamSize: Number(recruitTeamSize),
        recruitmentRadiusKm: Number(recruitRadius),
        recruitmentDeadline: recruitDeadline || undefined,
        requiredSkills: skillsArray,
        meetingDetails: {
          location: meetingLocation,
          instructions: meetingInstructions,
        },
      });

      setReport(response.data.report);
      toast.success('Team recruitment configured and activated!');
      fetchEligibleVolunteers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save configuration');
    } finally {
      setSavingRecruit(false);
    }
  };

  const handleInviteSingle = async (volunteerId) => {
    try {
      const response = await api.post(`/team/invite-volunteers/${id}`, {
        volunteerIds: [volunteerId],
      });
      toast.success(response.data.message || 'Invitation sent!');
      setInvitedIds((prev) => new Set([...prev, volunteerId]));
      fetchEligibleVolunteers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send invitation');
    }
  };

  const handleShare = async () => {
    if (!report) return;

    const shareData = {
      title: `LocalLens: ${report.title}`,
      text: report.description ? report.description.slice(0, 100) : '',
      url: window.location.href,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Report link copied to clipboard!');
    } catch {
      toast.error('Unable to copy link.');
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (requesting) return;

    setRequesting(true);
    try {
      const response = await api.post(`/team/request/${id}`, {
        note: requestNote.trim(),
      });
      toast.success(response.data.message || 'Assignment request submitted!');
      setHasRequested(true);
      setShowRequestModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="report-details-page">
        <Navbar />
        <div style={{ textAlign: 'center', padding: '100px 20px' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 16px' }} />
          <p className="text-muted">Loading report details...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="report-details-page">
        <Navbar />
        <main className="report-details-container">
          <div className="empty-state" style={{ marginTop: '48px' }}>
            <h3>Report Not Found</h3>
            <p>The issue you are looking for does not exist or has been removed.</p>
            <Link to="/reports" className="btn btn-primary" style={{ marginTop: '16px' }}>
              ← Return to Reports
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const images = Array.isArray(report.images) ? report.images : [];
  const history = Array.isArray(report.statusHistory) ? report.statusHistory : [];

  const isConfirmedMember = (report.teamMembers || []).some(
    (m) => m.user?._id?.toString() === user?.id || m.user?.toString() === user?.id || m.user?._id?.toString() === user?._id || m.user?.toString() === user?._id
  );
  const isDirectlyAssigned =
    report.assignedVolunteer?._id?.toString() === user?.id ||
    report.assignedVolunteer?._id?.toString() === user?._id;

  const isCoordinator =
    user?.role === 'admin' ||
    report.teamCoordinator?._id?.toString() === user?.id ||
    report.teamCoordinator?.toString() === user?.id ||
    report.teamCoordinator?._id?.toString() === user?._id ||
    report.teamCoordinator?.toString() === user?._id;

  const canEnterWorkspace = isConfirmedMember || isDirectlyAssigned || isCoordinator;

  return (
    <div className="report-details-page">
      <Navbar />

      <main className="report-details-container">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <Link
            to="/reports"
            className="report-details-back"
            style={{ marginBottom: 0 }}
          >
            ← Back to community reports
          </Link>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {canEnterWorkspace && (
              <Link
                to={`/reports/${report._id}/workspace`}
                className="btn btn-sm btn-primary"
              >
                🚀 Enter Private Team Workspace
              </Link>
            )}

            {isCoordinator && (
              <button
                type="button"
                onClick={handleOpenRecruitModal}
                className="btn btn-sm btn-gold"
              >
                👥 Recruit & Invite Nearby Volunteers
              </button>
            )}

            {user?.role === 'volunteer' &&
              !canEnterWorkspace &&
              !hasRequested &&
              !['resolved', 'rejected'].includes(report.status) && (
                <button
                  type="button"
                  onClick={() => setShowRequestModal(true)}
                  className="btn btn-sm btn-primary"
                >
                  + Request Assignment
                </button>
              )}

            {hasRequested && (
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                  padding: '6px 12px',
                  background: '#E8F0EA',
                  borderRadius: '999px',
                }}
              >
                ✓ Assignment Requested (Pending Review)
              </span>
            )}

            <button
              type="button"
              onClick={handleShare}
              className="btn btn-sm btn-outline"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <span>🔗</span> Share Issue
            </button>
          </div>
        </div>

        <article className="report-details-card">
          {/* Header */}
          <div>
            <div className="report-details-tags">
              <span className="citizen-card-category">
                {report.category || 'General'}
              </span>
              <span className={`status-badge status-${report.status || 'pending'}`}>
                {formatStatus(report.status)}
              </span>
              {report.priority && (
                <span
                  className={`priority-badge priority-${report.priority}`}
                >
                  {report.priority === 'urgent' && '🚨 Urgent'}
                  {report.priority === 'high' && '⚠️ High'}
                  {report.priority === 'medium' && '⏺ Medium'}
                  {report.priority === 'low' && '⚪ Low'}
                </span>
              )}
              {report.assignmentType === 'team' && (
                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-pill)',
                    background: '#E8F0EA',
                    color: 'var(--color-primary)',
                    border: '1px solid rgba(36,72,61,0.2)',
                  }}
                >
                  👥 Team Operation: {report.teamMembers?.length || 0} / {report.requiredTeamSize || 5} Confirmed
                </span>
              )}
            </div>

            <h1 className="report-details-title">{report.title}</h1>
            <p className="report-details-desc">{report.description}</p>
          </div>

          {/* Photo Gallery if images exist */}
          {images.length > 0 && (
            <section className="report-gallery-section">
              <h3>Attached Photos ({images.length})</h3>
              <div className="report-gallery-grid">
                {images.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`Report attachment ${i + 1}`}
                    className="report-gallery-img"
                    onClick={() => setActiveImage(img)}
                    title="Click to view full photo"
                  />
                ))}
              </div>
            </section>
          )}

          {/* Resolution Callout if resolved */}
          {report.status === 'resolved' && (
            <div className="report-resolution-callout">
              <h4>✓ Resolution Confirmation</h4>
              <p>
                {report.resolutionNote || 'This community issue was resolved and inspected.'}
              </p>
              {report.resolvedAt && (
                <p style={{ marginTop: '8px', fontSize: '12px', opacity: 0.85 }}>
                  Resolved on: {formatDate(report.resolvedAt)}
                </p>
              )}
            </div>
          )}

          {/* Metadata Grid */}
          <div className="report-meta-grid">
            <div className="report-meta-item">
              <span>Location / Address</span>
              <p>{report.address || 'Geo-coordinates logged'}</p>
            </div>

            <div className="report-meta-item">
              <span>Reported By</span>
              <p>{report.reporter?.name || 'Community Resident'}</p>
            </div>

            <div className="report-meta-item">
              <span>Date Submitted</span>
              <p>{formatDate(report.createdAt)}</p>
            </div>

            <div className="report-meta-item">
              <span>Assigned Volunteer / Team</span>
              <p>
                {report.assignmentType === 'team'
                  ? `Team Operation (${report.teamMembers?.length || 0}/${report.requiredTeamSize || 5} Members)`
                  : report.assignedVolunteer?.name || 'Unassigned / Open'}
              </p>
            </div>
          </div>

          {/* Status History Timeline */}
          {history.length > 0 && (
            <section className="report-timeline-section">
              <h3>Progress Audit Timeline</h3>
              <div className="report-timeline">
                {history.map((entry, index) => (
                  <div key={index} className="report-timeline-item">
                    <div className="report-timeline-header">
                      <span className="report-timeline-status">
                        Marked as {formatStatus(entry.status)}
                      </span>
                      <span className="report-timeline-date">
                        {formatDate(entry.changedAt)}
                      </span>
                    </div>
                    {entry.note && (
                      <p className="report-timeline-note">{entry.note}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </article>
      </main>

      {/* Volunteer Request Modal */}
      {showRequestModal && (
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
              maxWidth: '480px',
              width: '100%',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem' }}>
              Request Assignment on this Issue
            </h3>
            <p style={{ margin: '0 0 16px', color: 'var(--color-secondary)', fontSize: '14px' }}>
              Confirm your interest to respond to <strong>"{report.title}"</strong>. The team coordinator will review your request.
            </p>

            <form onSubmit={handleSubmitRequest}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="req-note" style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>
                  Availability / Note for Coordinator
                </label>
                <textarea
                  id="req-note"
                  rows={3}
                  value={requestNote}
                  onChange={(e) => setRequestNote(e.target.value)}
                  placeholder="E.g., I live 1 km away and am available this afternoon..."
                  className="form-control"
                  disabled={requesting}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  disabled={requesting}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={requesting}
                  className="btn btn-primary"
                >
                  {requesting ? 'Submitting...' : 'Confirm Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Smart Nearby Volunteer Recruitment Modal (For Admin & Coordinator) */}
      {showRecruitModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(30, 24, 22, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            backdropFilter: 'blur(6px)',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              padding: '32px',
              maxWidth: '750px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.3rem' }}>
                  Smart Nearby Volunteer Recruitment
                </h3>
                <p style={{ margin: '4px 0 0', color: 'var(--color-secondary)', fontSize: '13.5px' }}>
                  Target eligible community volunteers based on proximity to report coordinates, availability, and skills.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRecruitModal(false)}
                className="btn btn-sm btn-outline"
              >
                ✕ Close
              </button>
            </div>

            {/* Configuration Form */}
            <form onSubmit={handleSaveRecruitConfig} style={{ marginBottom: '24px', padding: '16px', background: '#FAF9F6', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Required Team Size
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={recruitTeamSize}
                    onChange={(e) => setRecruitTeamSize(e.target.value)}
                    className="form-control"
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Recruitment Radius (km)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={recruitRadius}
                    onChange={(e) => setRecruitRadius(e.target.value)}
                    className="form-control"
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Recruitment Deadline
                  </label>
                  <input
                    type="date"
                    value={recruitDeadline}
                    onChange={(e) => setRecruitDeadline(e.target.value)}
                    className="form-control"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  Meeting Point Location
                </label>
                <input
                  type="text"
                  value={meetingLocation}
                  onChange={(e) => setMeetingLocation(e.target.value)}
                  placeholder="E.g., North entrance gate near community center"
                  className="form-control"
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  Coordinator Instructions
                </label>
                <input
                  type="text"
                  value={meetingInstructions}
                  onChange={(e) => setMeetingInstructions(e.target.value)}
                  placeholder="E.g., Please bring heavy duty gloves and protective footwear..."
                  className="form-control"
                />
              </div>

              <button
                type="submit"
                disabled={savingRecruit}
                className="btn btn-sm btn-primary"
              >
                {savingRecruit ? 'Saving Configuration...' : 'Update & Open Recruitment'}
              </button>
            </form>

            {/* Nearby Eligible Volunteers List */}
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '1.05rem' }}>
                  Nearby Eligible Volunteers ({eligibleVolunteers.length})
                </h4>
                <button
                  type="button"
                  onClick={fetchEligibleVolunteers}
                  disabled={loadingEligible}
                  className="btn btn-sm btn-outline"
                >
                  ↻ Refresh Candidates
                </button>
              </div>

              {loadingEligible ? (
                <div style={{ textAlign: 'center', padding: '30px' }}>
                  <div className="loading-spinner" style={{ margin: '0 auto 8px' }} />
                  <p className="text-muted" style={{ fontSize: '13px' }}>Scanning volunteers by geospatial proximity...</p>
                </div>
              ) : eligibleVolunteers.length === 0 ? (
                <p className="text-muted" style={{ fontSize: '13px' }}>
                  No available volunteers found within {recruitRadius} km. Try expanding the recruitment radius above.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
                  {eligibleVolunteers.map((vol) => {
                    const isAlreadyInvited =
                      vol.invitationStatus === 'pending' || invitedIds.has(vol._id);
                    const isAlreadyConfirmed = vol.isConfirmed;

                    return (
                      <div
                        key={vol._id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          background: '#FAF9F6',
                          borderRadius: '8px',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '14px' }}>{vol.name}</strong>
                            {vol.isAvailable ? (
                              <span style={{ fontSize: '11px', color: 'var(--color-success)', fontWeight: 700 }}>
                                ● Available
                              </span>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#9BA39D' }}>
                                ○ Unavailable
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--color-secondary)', marginTop: '2px' }}>
                            {vol.distanceKm !== null ? `📍 ${vol.distanceKm} km away` : '📍 Location unlogged'} • ⭐ {vol.rating || 5.0} • {vol.completedTasks || 0} completed
                          </div>
                        </div>

                        <div>
                          {isAlreadyConfirmed ? (
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-success)' }}>
                              ✓ Confirmed Member
                            </span>
                          ) : isAlreadyInvited ? (
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#A96816' }}>
                              ✉️ Invite Sent
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleInviteSingle(vol._id)}
                              className="btn btn-sm btn-primary"
                            >
                              + Send Invitation
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {activeImage && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setActiveImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(30, 24, 22, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img
              src={activeImage}
              alt="Full size attachment"
              style={{
                maxWidth: '100%',
                maxHeight: '90vh',
                borderRadius: '12px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              }}
            />
            <button
              type="button"
              onClick={() => setActiveImage(null)}
              className="btn btn-primary"
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                padding: 0,
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
