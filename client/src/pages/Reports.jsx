import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api';

const statusColors = {
  pending: '#f59e0b',
  verified: '#3b82f6',
  assigned: '#8b5cf6',
  'in-progress': '#0d9488',
  resolved: '#16a34a',
  rejected: '#ef4444',
};

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await api.get('/reports');
        const data = response.data;
        setReports(Array.isArray(data) ? data : data.reports || []);
      } catch (error) {
        toast.error(
          error.response?.data?.message || 'Failed to load reports'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  return (
    <main style={{
      maxWidth: 1000,
      margin: '40px auto',
      padding: 20,
      fontFamily: 'Arial, sans-serif',
    }}>
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <div>
          <h1>Community Reports</h1>
          <p>Track and view issues reported in your community.</p>
        </div>

        <Link
          to="/reports/new"
          style={{
            background: '#2563eb',
            color: '#fff',
            padding: '10px 16px',
            borderRadius: 8,
            textDecoration: 'none',
          }}
        >
          + Create Report
        </Link>
      </header>

      <p>{reports.length} report(s)</p>

      {loading ? (
        <p>Loading reports...</p>
      ) : reports.length === 0 ? (
        <p>No reports available yet. Create the first report.</p>
      ) : (
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 18,
        }}>
          {reports.map((report) => (
            <article
              key={report._id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: 18,
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
              }}>
                <span style={{
                  fontSize: 12,
                  color: '#6b7280',
                  textTransform: 'capitalize',
                }}>
                  {report.category}
                </span>

                <span style={{
                  background: statusColors[report.status] || '#6b7280',
                  color: '#fff',
                  padding: '4px 8px',
                  borderRadius: 20,
                  fontSize: 12,
                }}>
                  {(report.status || 'unknown').replace('-', ' ')}
                </span>
              </div>

              <h2 style={{ fontSize: 20 }}>{report.title}</h2>

              <p style={{
                color: '#4b5563',
                lineHeight: 1.5,
                overflowWrap: 'anywhere',
              }}>
                {report.description}
              </p>

              {report.address && <p>📍 {report.address}</p>}

              {report.priority && (
                <p>
                  <strong>Priority:</strong> {report.priority}
                </p>
              )}

              <Link to={`/reports/${report._id}`}>
                View details →
              </Link>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}