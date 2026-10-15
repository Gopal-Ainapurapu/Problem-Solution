import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api';

const formatStatus = (status) =>
  status === 'in-progress'
    ? 'In Progress'
    : status.charAt(0).toUpperCase() + status.slice(1);

export default function VolunteerDashboard() {
  const [reports, setReports] = useState([]);
  const [notes, setNotes] = useState({});
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');

  const loadReports = useCallback(async () => {
    try {
      const response = await api.get('/reports/assigned');
      setReports(response.data.reports || []);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Unable to load assigned reports'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchInitialReports = async () => {
      try {
        const response = await api.get('/reports/assigned');

        if (!cancelled) {
          setReports(response.data.reports || []);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error.response?.data?.message ||
              'Unable to load assigned reports'
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
      assigned: reports.filter((r) => r.status === 'assigned').length,
      inProgress: reports.filter((r) => r.status === 'in-progress').length,
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

  const updateStatus = async (report, status) => {
    const note = (notes[report._id] || '').trim();

    if (status === 'resolved' && !note) {
      toast.error('Enter a resolution note before resolving the report');
      return;
    }

    setBusyId(report._id);

    try {
      const response = await api.patch(
        `/reports/${report._id}/status`,
        { status, note }
      );

      setReports((previous) =>
        previous.map((item) =>
          item._id === report._id ? response.data.report : item
        )
      );

      setNotes((previous) => ({
        ...previous,
        [report._id]: '',
      }));

      toast.success(`Report marked ${formatStatus(status).toLowerCase()}`);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Unable to update report status'
      );
    } finally {
      setBusyId('');
    }
  };

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '28px 20px',
        color: '#1f2937',
      }}
    >
      <Link to="/" style={{ textDecoration: 'none' }}>← Home</Link>

      <header style={{ margin: '28px 0' }}>
        <p style={{ color: '#64748b', marginBottom: 6 }}>
          LOCALLENS / VOLUNTEER
        </p>
        <h1 style={{ margin: 0 }}>Volunteer Dashboard</h1>
        <p style={{ color: '#64748b' }}>
          Manage your assigned community issues and update their progress.
        </p>
      </header>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 16,
          marginBottom: 28,
        }}
      >
        {[
          ['Total assigned', counts.total],
          ['Ready to start', counts.assigned],
          ['In progress', counts.inProgress],
          ['Resolved', counts.resolved],
        ].map(([title, count]) => (
          <article
            key={title}
            style={{
              padding: 20,
              border: '1px solid #e2e8f0',
              borderRadius: 12,
              background: '#fff',
            }}
          >
            <p style={{ color: '#64748b', margin: 0 }}>{title}</p>
            <h2 style={{ fontSize: 30, margin: '12px 0 0' }}>{count}</h2>
          </article>
        ))}
      </section>

      <section
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 20,
        }}
      >
        <div>
          <h2 style={{ marginBottom: 6 }}>My reports</h2>
          <p style={{ margin: 0, color: '#64748b' }}>
            Only reports assigned to your account appear here.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label="Filter assigned reports"
            style={{ padding: 10, borderRadius: 8, border: '1px solid #cbd5e1' }}
          >
            <option value="all">All reports</option>
            <option value="assigned">Assigned</option>
            <option value="in-progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>

          <button
            onClick={handleRefresh}
            disabled={loading}
            style={{
              padding: '10px 14px',
              border: 0,
              borderRadius: 8,
              background: '#3563e9',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </section>

      {loading ? (
        <p>Loading your assigned reports...</p>
      ) : visibleReports.length === 0 ? (
        <article
          style={{
            padding: 32,
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            textAlign: 'center',
          }}
        >
          <h3>No reports found</h3>
          <p style={{ color: '#64748b' }}>
            Reports assigned to you will appear here.
          </p>
        </article>
      ) : (
        <section style={{ display: 'grid', gap: 16 }}>
          {visibleReports.map((report) => (
            <article
              key={report._id}
              style={{
                padding: 22,
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                background: '#fff',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 12,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: 220 }}>
                  <h3 style={{ marginTop: 0 }}>{report.title}</h3>
                  <p style={{ lineHeight: 1.6 }}>{report.description}</p>
                  <p><strong>Category:</strong> {report.category}</p>
                  {report.address && (
                    <p><strong>Location:</strong> {report.address}</p>
                  )}
                </div>

                <span
                  style={{
                    padding: '6px 10px',
                    borderRadius: 20,
                    background:
                      report.status === 'resolved'
                        ? '#dcfce7'
                        : report.status === 'in-progress'
                          ? '#dbeafe'
                          : '#fef3c7',
                    color:
                      report.status === 'resolved'
                        ? '#166534'
                        : report.status === 'in-progress'
                          ? '#1d4ed8'
                          : '#92400e',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {formatStatus(report.status)}
                </span>
              </div>

              {report.status === 'assigned' && (
                <button
                  disabled={busyId === report._id}
                  onClick={() => updateStatus(report, 'in-progress')}
                  style={{
                    padding: '10px 15px',
                    border: 0,
                    borderRadius: 8,
                    background: '#3563e9',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  {busyId === report._id ? 'Updating...' : 'Start work'}
                </button>
              )}

              {report.status === 'in-progress' && (
                <div style={{ display: 'grid', gap: 10, maxWidth: 600 }}>
                  <label htmlFor={`note-${report._id}`}>
                    Resolution note
                  </label>
                  <textarea
                    id={`note-${report._id}`}
                    rows={3}
                    maxLength={500}
                    value={notes[report._id] || ''}
                    onChange={(event) =>
                      setNotes((previous) => ({
                        ...previous,
                        [report._id]: event.target.value,
                      }))
                    }
                    placeholder="Describe the work completed..."
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: 12,
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      font: 'inherit',
                    }}
                  />
                  <button
                    disabled={busyId === report._id}
                    onClick={() => updateStatus(report, 'resolved')}
                    style={{
                      justifySelf: 'start',
                      padding: '10px 15px',
                      border: 0,
                      borderRadius: 8,
                      background: '#16845b',
                      color: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    {busyId === report._id
                      ? 'Updating...'
                      : 'Mark resolved'}
                  </button>
                </div>
              )}

              {report.status === 'resolved' && report.resolutionNote && (
                <p>
                  <strong>Resolution:</strong> {report.resolutionNote}
                </p>
              )}

              <p style={{ marginBottom: 0, marginTop: 16 }}>
                <Link to={`/reports/${report._id}`}>
                  View report details →
                </Link>
              </p>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}