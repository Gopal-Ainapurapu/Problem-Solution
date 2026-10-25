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
  pending: '#A96816',
  verified: '#386A91',
  assigned: '#593A8B',
  'in-progress': '#C49A55',
  resolved: '#287A52',
  rejected: '#B83A3A',
};

const CATEGORY_COLORS = [
  '#24483D',
  '#C49A55',
  '#287A52',
  '#386A91',
  '#593A8B',
  '#A96816',
  '#69736D',
  '#19382F',
];

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
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const loadAnalytics = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }

    try {
      const response = await api.get('/reports/analytics');
      const data = response.data?.analytics;

      if (!response.data?.success || !data) {
        throw new Error('Invalid analytics response.');
      }

      setAnalytics(data);
      setLoadError(false);
    } catch (error) {
      setLoadError(true);
      toast.error(
        error.response?.data?.message ||
          'Unable to load analytics. Check your admin access.'
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
        const response = await api.get('/reports/analytics');
        const data = response.data?.analytics;

        if (!ignore && response.data?.success && data) {
          setAnalytics(data);
          setLoadError(false);
        }
      } catch (error) {
        if (!ignore) {
          setLoadError(true);
          toast.error(
            error.response?.data?.message ||
              'Unable to load analytics. Check your admin access.'
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

  const statuses = analytics?.statusCounts || {};
  const statusData = Object.entries(statuses).map(([status, count]) => ({
    name: formatLabel(status),
    status,
    count,
  }));

  const categoryData = (analytics?.categoryCounts || []).map((item) => ({
    name: formatLabel(item.category),
    count: item.count,
  }));

  const monthlyData = (analytics?.monthlyReports || []).map((item) => ({
    name: formatMonth(item.month),
    reports: item.reports,
  }));

  const resolutionHours = analytics?.resolution?.averageHours;
  const resolutionDisplay =
    resolutionHours === null || resolutionHours === undefined
      ? 'N/A'
      : resolutionHours < 24
        ? `${resolutionHours} hrs`
        : `${Math.round((resolutionHours / 24) * 10) / 10} days`;

  return (
    <main className="analytics-page">
      <header className="analytics-topbar">
        <div>
          <span className="analytics-eyebrow">Municipal Intelligence</span>
          <h1>Analytics & Trends</h1>
          <p className="analytics-description">
            City-wide insights on report velocity, resolution efficiency, category distributions, and multi-month community trends.
          </p>
        </div>

        <div className="analytics-header-actions">
          <Link to="/admin" className="btn btn-outline">
            ← Admin Console
          </Link>
          <button
            type="button"
            onClick={() => loadAnalytics(true)}
            disabled={refreshing || loading}
            className="btn btn-primary"
          >
            {refreshing ? 'Refreshing...' : '↻ Refresh Data'}
          </button>
        </div>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 16px' }} />
          <p className="text-muted">Loading municipal analytics data...</p>
        </div>
      ) : loadError || !analytics ? (
        <div className="empty-state">
          <h3>Unable to load analytics</h3>
          <p>Please confirm your account has administrator privileges.</p>
          <button
            type="button"
            onClick={() => loadAnalytics(true)}
            className="btn btn-primary"
            style={{ marginTop: '16px' }}
          >
            Try Again
          </button>
        </div>
      ) : (
        <>
          {/* Summary KPIs */}
          <section className="analytics-metrics-grid" aria-label="Key Performance Indicators">
            <StatCard
              title="Total Issues Logged"
              value={analytics.totalReports}
              subtitle="All time reports submitted"
            />
            <StatCard
              title="Successfully Resolved"
              value={analytics.resolution?.resolvedCount || 0}
              subtitle={`${
                analytics.totalReports > 0
                  ? Math.round(
                      ((analytics.resolution?.resolvedCount || 0) /
                        analytics.totalReports) *
                        100
                    )
                  : 0
              }% completion rate`}
            />
            <StatCard
              title="Avg. Resolution Time"
              value={resolutionDisplay}
              subtitle="From submission to resolution"
            />
            <StatCard
              title="Active In Progress"
              value={
                (statuses.assigned || 0) + (statuses['in-progress'] || 0)
              }
              subtitle="Assigned or currently being fixed"
            />
          </section>

          {/* Charts Row 1: Status Distribution & Reports by Category */}
          <div className="analytics-grid-two">
            <ChartPanel
              title="Status Distribution"
              description="Current lifecycle stage breakdown of all community reports"
            >
              <div className="analytics-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={4}
                    >
                      {statusData.map((entry) => (
                        <Cell
                          key={entry.status}
                          fill={STATUS_COLORS[entry.status] || '#78716C'}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid var(--color-border)',
                        background: '#ffffff',
                        fontSize: '13px',
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartPanel>

            <ChartPanel
              title="Issues by Category"
              description="Volume distribution across civic issue categories"
            >
              <div className="analytics-chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0dfd2" />
                    <XAxis type="number" stroke="var(--color-muted)" />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={90}
                      stroke="var(--color-navy)"
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: '1px solid var(--color-border)',
                        background: '#ffffff',
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                      {categoryData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartPanel>
          </div>

          {/* Charts Row 2: 6-Month Trends */}
          <ChartPanel
            title="6-Month Submission Trend"
            description="Report volume velocity over the current and prior five months"
          >
            <div className="analytics-chart-container" style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0dfd2" />
                  <XAxis dataKey="name" stroke="var(--color-navy)" />
                  <YAxis stroke="var(--color-muted)" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid var(--color-border)',
                      background: '#ffffff',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="reports"
                    name="Reports Logged"
                    stroke="var(--color-primary)"
                    strokeWidth={3}
                    dot={{ fill: 'var(--color-primary)', r: 6 }}
                    activeDot={{ r: 8, stroke: '#fff', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartPanel>
        </>
      )}
    </main>
  );
}
