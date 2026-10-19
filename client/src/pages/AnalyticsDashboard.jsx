
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './AnalyticsDashboard.css';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import toast from 'react-hot-toast';
import api from '../api';

const STATUS_COLORS = {
  pending: '#D97706',
  verified: '#2563EB',
  assigned: '#7C3AED',
  'in-progress': '#0891B2',
  resolved: '#16A34A',
  rejected: '#DC2626',
};

const CATEGORY_LABELS = {
  garbage: 'Garbage',
  roads: 'Roads',
  water: 'Water',
  electricity: 'Electricity',
  streetlight: 'Streetlight',
  drainage: 'Drainage',
  'public-safety': 'Public Safety',
  other: 'Other',
};

const formatLabel = (value = '') =>
  value
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const formatMonth = (value = '') => {
  const [year, month] = value.split('-').map(Number);
  if (!year || !month) return value;

  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
    month: 'short',
    year: '2-digit',
  });
};

function StatCard({ title, value, subtitle }) {
  return (
    <article className="analytics-stat-card">
      <p className="analytics-stat-label">{title}</p>
      <h2 className="analytics-stat-value">{value}</h2>
      <p className="analytics-stat-subtitle">{subtitle}</p>
    </article>
  );
}

function ChartPanel({ title, description, children }) {
  return (
    <section className="analytics-panel">
      <header className="analytics-panel-header">
        <h2>{title}</h2>
        <p>{description}</p>
      </header>
      {children}
    </section>
  );
}

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setLoadError(false);

    try {
      const response = await api.get('/reports/analytics');
      const data = response.data?.analytics;

      if (!response.data?.success || !data) {
        throw new Error('Invalid analytics response.');
      }

      setAnalytics(data);
    } catch (error) {
      setLoadError(true);
      toast.error(
        error.response?.data?.message ||
          'Unable to load analytics. Check your admin access.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const statuses = analytics?.statusCounts || {};
  const statusData = Object.entries(statuses).map(([status, count]) => ({
    name: formatLabel(status),
    status,
    count,
  }));

  const categoryData = (analytics?.categoryCounts || []).map((item) => ({
    name: CATEGORY_LABELS[item.category] || formatLabel(item.category),
    count: item.count,
  }));

  const monthlyData = (analytics?.monthlyReports || []).map((item) => ({
    ...item,
    monthLabel: formatMonth(item.month),
  }));

  const resolutionHours = analytics?.resolution?.averageHours;

  return (
    <main className="analytics-page">
      <header className="analytics-topbar">
        <div>
          <p className="analytics-eyebrow">LocalLens / Insights</p>
          <h1>Analytics Dashboard</h1>
          <p className="analytics-description">
            Understand community reports, issue categories, and resolution
            performance.
          </p>
        </div>

        <div className="analytics-header-actions">
          <Link to="/admin" className="analytics-secondary-button">
            Admin dashboard
          </Link>
          <button
            type="button"
            className="analytics-primary-button"
            onClick={loadAnalytics}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh data'}
          </button>
        </div>
      </header>

      {loading && !analytics ? (
        <div className="analytics-message">Loading analytics...</div>
      ) : loadError && !analytics ? (
        <section className="analytics-message analytics-error">
          <h2>Analytics could not be loaded</h2>
          <p>
            Confirm that the backend is running, the analytics endpoint exists,
            and you are logged in with an admin account.
          </p>
          <button
            type="button"
            className="analytics-primary-button"
            onClick={loadAnalytics}
          >
            Try again
          </button>
        </section>
      ) : (
        <>
          {loadError && (
            <p className="analytics-warning">
              Refresh failed. Showing the last successfully loaded data.
            </p>
          )}

          <section className="analytics-stats-grid">
            <StatCard
              title="Total reports"
              value={analytics?.totalReports ?? 0}
              subtitle="All reports in the database"
            />
            <StatCard
              title="Pending review"
              value={statuses.pending ?? 0}
              subtitle="Awaiting verification"
            />
            <StatCard
              title="In progress"
              value={statuses['in-progress'] ?? 0}
              subtitle="Work underway"
            />
            <StatCard
              title="Resolved"
              value={statuses.resolved ?? 0}
              subtitle="Marked as resolved"
            />
          </section>

          <section className="analytics-chart-grid">
            <ChartPanel
              title="Reports by status"
              description="Current distribution across report workflows"
            >
              {statusData.length === 0 ? (
                <p className="analytics-empty">No status data available.</p>
              ) : (
                <div className="analytics-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        outerRadius={105}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {statusData.map((item) => (
                          <Cell
                            key={item.status}
                            fill={STATUS_COLORS[item.status] || '#64748B'}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartPanel>

            <ChartPanel
              title="Reports by category"
              description="Which types of issues are reported most often"
            >
              {categoryData.length === 0 ? (
                <p className="analytics-empty">No category data available.</p>
              ) : (
                <div className="analytics-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={categoryData}
                      margin={{ top: 12, right: 12, left: -12, bottom: 45 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        angle={-30}
                        textAnchor="end"
                        interval={0}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar
                        dataKey="count"
                        name="Reports"
                        fill="#0D9488"
                        radius={[5, 5, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartPanel>

            <div className="analytics-wide-panel">
              <ChartPanel
                title="Monthly report trend"
                description="Reports created in each of the last six calendar months"
              >
                <div className="analytics-chart analytics-trend-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={monthlyData}
                      margin={{ top: 12, right: 20, left: 0, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="monthLabel" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="reports"
                        name="Reports created"
                        stroke="#0D9488"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </ChartPanel>
            </div>
          </section>

          <section className="analytics-panel analytics-resolution-panel">
            <div>
              <h2>Resolution performance</h2>
              <p>
                Average elapsed time from report creation to resolution,
                for resolved reports with recorded timestamps.
              </p>
            </div>
            <div className="analytics-resolution-value">
              {resolutionHours == null
                ? 'N/A'
                : `${resolutionHours.toLocaleString('en-IN')} hours`}
            </div>
          </section>

          <footer className="analytics-footer">
            Statistics are calculated from the report records returned by the
            analytics API.
            {analytics?.generatedAt && (
              <span>
                {' '}
                Updated {new Date(analytics.generatedAt).toLocaleString('en-IN')}
              </span>
            )}
          </footer>
        </>
      )}
    </main>
  );
}
