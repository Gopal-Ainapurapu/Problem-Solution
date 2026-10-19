
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api';

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

const getChangedByName = (changedBy) => {
  if (!changedBy) return 'Unknown user';

  if (typeof changedBy === 'object') {
    return changedBy.name || 'User';
  }

  return 'User';
};

export default function ReportDetails() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchReport = async () => {
      setLoading(true);

      try {
        const response = await api.get(`/reports/${id}`);

        if (!cancelled) {
          setReport(response.data.report || response.data);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error.response?.data?.message ||
              'Failed to load report'
          );
          setReport(null);
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

  if (loading) {
    return <p style={{ padding: 24 }}>Loading report...</p>;
  }

  if (!report) {
    return (
      <main style={pageStyle}>
        <h1>Report not found</h1>
        <Link to="/reports">Back to reports</Link>
      </main>
    );
  }

  const history = Array.isArray(report.statusHistory)
    ? [...report.statusHistory].reverse()
    : [];

  const images = Array.isArray(report.images)
    ? report.images.filter(
        (image) => typeof image === 'string' && image.trim()
      )
    : [];

  return (
    <main style={pageStyle}>
      <Link to="/reports" style={linkStyle}>
        ← Back to reports
      </Link>

      <section style={cardStyle}>
        <p style={eyebrowStyle}>LOCALLENS / REPORT DETAILS</p>

        <h1>{report.title}</h1>

        <p style={{ lineHeight: 1.7 }}>
          {report.description}
        </p>

        <div style={detailsGridStyle}>
          <div>
            <span style={labelStyle}>Category</span>
            <p>{report.category || 'Not specified'}</p>
          </div>

          <div>
            <span style={labelStyle}>Current status</span>
            <p>
              <span style={statusStyle(report.status)}>
                {formatStatus(report.status)}
              </span>
            </p>
          </div>

          <div>
            <span style={labelStyle}>Priority</span>
            <p>{report.priority || 'Not specified'}</p>
          </div>

          <div>
            <span style={labelStyle}>Address</span>
            <p>{report.address || 'Not provided'}</p>
          </div>
        </div>

        {/* Report image gallery */}
        <section style={gallerySectionStyle}>
          <h2 style={{ marginBottom: 8 }}>Report Photos</h2>

          {images.length === 0 ? (
            <p style={mutedStyle}>
              No photos have been uploaded for this report.
            </p>
          ) : (
            <>
              <p style={mutedStyle}>
                {images.length} photo{images.length !== 1 ? 's' : ''}
              </p>

              <div style={galleryGridStyle}>
                {images.map((image, index) => (
                  <a
                    key={`${image}-${index}`}
                    href={image}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open full-size photo in a new tab"
                    style={imageLinkStyle}
                  >
                    <img
                      src={image}
                      alt={`Report photo ${index + 1}`}
                      loading="lazy"
                      style={galleryImageStyle}
                    />
                  </a>
                ))}
              </div>
            </>
          )}
        </section>

        {report.resolutionNote && (
          <div style={resolutionStyle}>
            <h3>Resolution details</h3>
            <p>{report.resolutionNote}</p>

            {report.resolvedAt && (
              <p style={mutedStyle}>
                Resolved on {formatDate(report.resolvedAt)}
              </p>
            )}
          </div>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>Report History</h2>

        <p style={mutedStyle}>
          Follow the progress of this community issue.
        </p>

        {history.length === 0 ? (
          <div style={emptyStyle}>
            <p>No status history is available yet.</p>
          </div>
        ) : (
          <div style={timelineStyle}>
            {history.map((item, index) => (
              <article
                key={
                  item._id ||
                  `${item.status}-${item.changedAt || index}`
                }
                style={timelineItemStyle}
              >
                <div style={timelineDotStyle} />

                <div style={timelineCardStyle}>
                  <h3 style={{ margin: '0 0 8px' }}>
                    {formatStatus(item.status)}
                  </h3>

                  <p style={mutedStyle}>
                    {formatDate(item.changedAt)}
                  </p>

                  <p style={mutedStyle}>
                    Updated by: {getChangedByName(item.changedBy)}
                  </p>

                  {item.note && (
                    <p style={{ lineHeight: 1.6 }}>
                      {item.note}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

const pageStyle = {
  maxWidth: 800,
  margin: '40px auto',
  padding: 20,
  fontFamily: 'Arial, sans-serif',
  color: '#1f2937',
};

const linkStyle = {
  color: '#3563e9',
  textDecoration: 'none',
};

const cardStyle = {
  marginTop: 24,
  padding: 24,
  border: '1px solid #e2e8f0',
  borderRadius: 14,
  background: '#fff',
};

const eyebrowStyle = {
  color: '#64748b',
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 1,
};

const detailsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 16,
  marginTop: 24,
};

const labelStyle = {
  color: '#64748b',
  fontSize: 13,
  fontWeight: 600,
};

const statusStyle = (status) => ({
  display: 'inline-block',
  padding: '6px 10px',
  borderRadius: 20,
  background:
    status === 'resolved'
      ? '#dcfce7'
      : status === 'in-progress'
        ? '#dbeafe'
        : '#fef3c7',
  color:
    status === 'resolved'
      ? '#166534'
      : status === 'in-progress'
        ? '#1d4ed8'
        : '#92400e',
  fontSize: 13,
  fontWeight: 700,
});

const gallerySectionStyle = {
  marginTop: 28,
  paddingTop: 20,
  borderTop: '1px solid #e2e8f0',
};

const galleryGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 12,
  marginTop: 16,
};

const imageLinkStyle = {
  display: 'block',
  overflow: 'hidden',
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
};

const galleryImageStyle = {
  display: 'block',
  width: '100%',
  height: 180,
  objectFit: 'cover',
};

const resolutionStyle = {
  marginTop: 20,
  padding: 16,
  borderRadius: 10,
  background: '#f0fdf4',
  border: '1px solid #bbf7d0',
};

const mutedStyle = {
  color: '#64748b',
  fontSize: 14,
};

const emptyStyle = {
  padding: 24,
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  background: '#fff',
};

const timelineStyle = {
  marginTop: 20,
  borderLeft: '2px solid #cbd5e1',
  marginLeft: 10,
};

const timelineItemStyle = {
  position: 'relative',
  paddingLeft: 24,
  paddingBottom: 20,
};

const timelineDotStyle = {
  position: 'absolute',
  left: -8,
  top: 8,
  width: 14,
  height: 14,
  borderRadius: '50%',
  background: '#3563e9',
  border: '3px solid #fff',
  boxSizing: 'border-box',
};

const timelineCardStyle = {
  padding: 16,
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  background: '#fff',
};
