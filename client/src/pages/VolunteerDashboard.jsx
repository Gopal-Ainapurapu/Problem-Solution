
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api';

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

const getStatusColors = (status) => {
  switch (status) {
    case 'assigned':
      return { background: '#fef3c7', color: '#92400e' };
    case 'in-progress':
      return { background: '#dbeafe', color: '#1d4ed8' };
    case 'resolved':
      return { background: '#dcfce7', color: '#166534' };
    case 'rejected':
      return { background: '#fee2e2', color: '#991b1b' };
    default:
      return { background: '#f1f5f9', color: '#475569' };
  }
};

export default function VolunteerDashboard() {
  const [reports, setReports] = useState([]);
  const [notes, setNotes] = useState({});
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [busyId, setBusyId] = useState('');

  const loadReports = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await api.get('/reports/assigned');
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
          'Unable to load assigned reports'
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
      assigned: reports.filter(
        (report) => report.status === 'assigned'
      ).length,
      inProgress: reports.filter(
        (report) => report.status === 'in-progress'
      ).length,
      resolved: reports.filter(
        (report) => report.status === 'resolved'
      ).length,
    }),
    [reports]
  );

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

    const note = (notes[report._id] || '').trim();

    if (status === 'resolved' && !note) {
      toast.error('Enter a resolution note before resolving the report');
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

      setReports((previous) =>
        previous.map((item) => {
          if (item._id !== report._id) return item;

          // Use the server response whenever it contains the updated report.
          // Otherwise, apply the requested status locally.
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
        setNotes((previous) => ({
          ...previous,
          [report._id]: '',
        }));
      }

      toast.success(
        `Report marked ${formatStatus(status).toLowerCase()}`
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

  const handleRefresh = () => {
    loadReports(true);
  };

  const inputStyle = {
    padding: 10,
    borderRadius: 8,
    border: '1px solid #cbd5e1',
    background: '#fff',
    color: '#1f2937',
    fontSize: 14,
  };

  const buttonStyle = {
    padding: '10px 15px',
    border: 0,
    borderRadius: 8,
    color: '#fff',
    cursor: 'pointer',
    fontSize: 14,
  };

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '28px 20px',
        color: '#1f2937',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <Link to="/" style={{ textDecoration: 'none' }}>
        ← Home
      </Link>

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
            <h2 style={{ fontSize: 30, margin: '12px 0 0' }}>
              {count}
            </h2>
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
          <h2 style={{ marginBottom: 6 }}>My assigned reports</h2>
          <p style={{ margin: 0, color: '#64748b' }}>
            Only reports assigned to your account should appear here.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <input
            type="search"
            aria-label="Search assigned reports"
            placeholder="Search reports..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={inputStyle}
          />

          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label="Filter assigned reports"
            style={inputStyle}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status === 'all'
                  ? 'All reports'
                  : formatStatus(status)}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading || refreshing || Boolean(busyId)}
            style={{
              ...buttonStyle,
              background: '#3563e9',
              opacity: loading || refreshing ? 0.7 : 1,
            }}
          >
            {refreshing ? 'Refreshing...' : '↻ Refresh'}
          </button>
        </div>
      </section>

      {loading ? (
        <p>Loading your assigned reports...</p>
      ) : loadError ? (
        <article
          style={{
            padding: 32,
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            textAlign: 'center',
          }}
        >
          <h3>Unable to load your tasks</h3>
          <p style={{ color: '#64748b' }}>
            Check your connection and try again.
          </p>

          <button
            type="button"
            onClick={() => loadReports()}
            style={{ ...buttonStyle, background: '#3563e9' }}
          >
            Try again
          </button>
        </article>
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
            {reports.length === 0
              ? 'Reports assigned to you will appear here.'
              : 'Try another search term or status filter.'}
          </p>

          {(search || filter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setFilter('all');
              }}
              style={{ ...buttonStyle, background: '#3563e9' }}
            >
              Clear filters
            </button>
          )}
        </article>
      ) : (
        <section style={{ display: 'grid', gap: 16 }}>
          {visibleReports.map((report) => {
            const statusColors = getStatusColors(report.status);
            const isBusy = busyId === report._id;

            return (
              <article
                key={report._id}
                style={{
                  padding: 22,
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  background: '#fff',
                  overflowWrap: 'anywhere',
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
                    <h3 style={{ marginTop: 0 }}>
                      {report.title || 'Untitled report'}
                    </h3>

                    <p style={{ lineHeight: 1.6 }}>
                      {report.description || 'No description provided.'}
                    </p>

                    <p>
                      <strong>Category:</strong>{' '}
                      {formatCategory(report.category)}
                    </p>

                    {report.address && (
                      <p>
                        <strong>Location:</strong> {report.address}
                      </p>
                    )}

                    {report.priority && (
                      <p>
                        <strong>Priority:</strong> {report.priority}
                      </p>
                    )}

                    {report.assignedVolunteer?.name && (
                      <p>
                        <strong>Assigned to:</strong>{' '}
                        {report.assignedVolunteer.name}
                      </p>
                    )}
                  </div>

                  <span
                    style={{
                      padding: '6px 10px',
                      borderRadius: 20,
                      background: statusColors.background,
                      color: statusColors.color,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {formatStatus(report.status)}
                  </span>
                </div>

                {report.status === 'assigned' && (
                  <button
                    type="button"
                    disabled={Boolean(busyId)}
                    onClick={() => updateStatus(report, 'in-progress')}
                    style={{
                      ...buttonStyle,
                      background: '#3563e9',
                      opacity: isBusy ? 0.7 : 1,
                    }}
                  >
                    {isBusy ? 'Updating...' : 'Start work'}
                  </button>
                )}

                {report.status === 'in-progress' && (
                  <div
                    style={{
                      display: 'grid',
                      gap: 10,
                      maxWidth: 600,
                    }}
                  >
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

                    <small style={{ color: '#64748b' }}>
                      {(notes[report._id] || '').length}/500 characters
                    </small>

                    <button
                      type="button"
                      disabled={Boolean(busyId)}
                      onClick={() => updateStatus(report, 'resolved')}
                      style={{
                        ...buttonStyle,
                        justifySelf: 'start',
                        background: '#16845b',
                        opacity: isBusy ? 0.7 : 1,
                      }}
                    >
                      {isBusy ? 'Updating...' : 'Mark resolved'}
                    </button>
                  </div>
                )}

                {report.status === 'resolved' && (
                  <div
                    style={{
                      marginTop: 14,
                      padding: 12,
                      background: '#f0fdf4',
                      borderRadius: 8,
                    }}
                  >
                    <strong>Resolution note:</strong>
                    <p style={{ marginBottom: 0 }}>
                      {report.resolutionNote ||
                        'This report has been marked as resolved.'}
                    </p>

                    {report.resolvedAt && (
                      <small style={{ color: '#64748b' }}>
                        Resolved on{' '}
                        {new Date(report.resolvedAt).toLocaleDateString()}
                      </small>
                    )}
                  </div>
                )}

                {report.status === 'rejected' && (
                  <p style={{ color: '#991b1b' }}>
                    This report has been rejected.
                  </p>
                )}

                <p style={{ marginBottom: 0, marginTop: 16 }}>
                  <Link to={`/reports/${report._id}`}>
                    View report details →
                  </Link>
                </p>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
