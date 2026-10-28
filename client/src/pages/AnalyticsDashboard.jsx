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
  AreaChart,
  Area,
} from 'recharts';
import toast from 'react-hot-toast';
import api from '../api';
import Navbar from '../components/Navbar';

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

const PRIORITY_COLORS = {
  Urgent: '#B83A3A',
  High: '#C49A55',
  Medium: '#386A91',
  Low: '#287A52',
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

function StatCard({ title, value, subtitle, icon, highlightColor }) {
  return (
    <article className="analytics-stat-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p className="analytics-stat-label">{title}</p>
        {icon && <span style={{ fontSize: '18px' }}>{icon}</span>}
      </div>
      <h2 className="analytics-stat-value" style={highlightColor ? { color: highlightColor } : undefined}>
        {value}
      </h2>
      <p className="analytics-stat-subtitle">{subtitle}</p>
    </article>
  );
}

function ChartPanel({ title, description, children, fullWidth = false }) {
  return (
    <section className={`analytics-panel ${fullWidth ? 'full-width' : ''}`}>
      <header className="analytics-panel-header">
        <h2>{title}</h2>
        <p>{description}</p>
      </header>
      <div className="chart-wrapper">{children}</div>
    </section>
  );
}

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const fetchAnalytics = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
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
      if (isManualRefresh) {
        toast.success('Analytics refreshed with latest municipal data.');
      }
    } catch (error) {
      setLoadError(true);
      toast.error(
        error.response?.data?.message ||
          'Unable to load analytics. Check your administrator permissions.'
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
              'Unable to load analytics. Check your administrator permissions.'
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

  const priorityMap = analytics?.priorityCounts || {};
  const priorityData = [
    { name: 'Urgent', count: priorityMap.urgent || 0 },
    { name: 'High', count: priorityMap.high || 0 },
    { name: 'Medium', count: priorityMap.medium || 0 },
    { name: 'Low', count: priorityMap.low || 0 },
  ];

  const monthlyData = (analytics?.monthlyReports || []).map((item) => ({
    name: formatMonth(item.month),
    Submitted: item.reports,
    Resolved: item.resolved || 0,
  }));

  const totalReports = analytics?.totalReports || 0;
  const resolvedCount = analytics?.resolution?.resolvedCount || 0;
  const resolutionRate =
    totalReports > 0 ? Math.round((resolvedCount / totalReports) * 100) : 0;

  const resolutionHours = analytics?.resolution?.averageHours;
  const resolutionDisplay =
    resolutionHours === null || resolutionHours === undefined
      ? 'N/A'
      : resolutionHours < 24
        ? `${resolutionHours} hrs`
        : `${Math.round((resolutionHours / 24) * 10) / 10} days`;

  const urgentCount =
    (priorityMap.urgent || 0) + (priorityMap.high || 0);

  return (
    <div className="analytics-page">
      <Navbar />

      <main className="analytics-main">
        <header className="analytics-header">
          <div>
            <div className="analytics-eyebrow">
              <span aria-hidden="true">📊</span> Municipal Intelligence & Oversight
            </div>
            <h1>Civic Analytics & Trends</h1>
            <p className="analytics-subtitle">
              Comprehensive city-wide insights on report velocity, resolution efficiency, category hotspots, and team deployments.
            </p>
          </div>

          <div className="analytics-actions">
            <Link to="/admin" className="btn btn-outline">
              ← Admin Console
            </Link>
            <Link to="/map" className="btn btn-outline">
              🗺️ Geospatial Map
            </Link>
            <button
              type="button"
              onClick={() => fetchAnalytics(true)}
              disabled={refreshing || loading}
              className="btn btn-primary"
            >
              {refreshing ? 'Refreshing...' : '↻ Refresh Data'}
            </button>
          </div>
        </header>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px 20px' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 16px' }} />
            <p className="text-muted">Aggregating municipal telemetry and reports data...</p>
          </div>
        ) : loadError || !analytics ? (
          <div className="empty-state" style={{ margin: '40px auto', maxWidth: '500px' }}>
            <h3>Unable to Load Analytics</h3>
            <p>Please confirm your account has administrator privileges.</p>
            <button
              type="button"
              onClick={() => fetchAnalytics(true)}
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
                title="Total Reports Logged"
                value={totalReports}
                subtitle="All-time citizen issues reported"
                icon="📋"
              />
              <StatCard
                title="Resolution Rate"
                value={`${resolutionRate}%`}
                subtitle={`${resolvedCount} resolved of ${totalReports} reports`}
                icon="✓"
                highlightColor="var(--color-success, #287A52)"
              />
              <StatCard
                title="Avg. Resolution Time"
                value={resolutionDisplay}
                subtitle="From verified filing to marked resolved"
                icon="⏱️"
              />
              <StatCard
                title="Urgent & High Priority"
                value={urgentCount}
                subtitle="Critical infrastructure & safety items"
                icon="⚠️"
                highlightColor={urgentCount > 0 ? 'var(--color-error, #B83A3A)' : undefined}
              />
            </section>

            {/* Charts Row 1: Status Distribution & Issues by Category */}
            <div className="analytics-charts-grid">
              <ChartPanel
                title="Status Lifecycle Breakdown"
                description="Current progress stage of all submitted community reports"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
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
                        borderRadius: '10px',
                        border: '1px solid var(--color-border, #E4E6DF)',
                        background: '#ffffff',
                        fontSize: '13px',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value) => (
                        <span style={{ fontSize: '12px', color: '#202824' }}>{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartPanel>

              <ChartPanel
                title="Issues by Civic Category"
                description="Incident volume distribution across municipal operational departments"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0eade" horizontal={false} />
                    <XAxis type="number" stroke="var(--color-secondary, #69736D)" />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={100}
                      stroke="var(--color-text, #202824)"
                      tick={{ fontSize: 12, fontWeight: 500 }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '10px',
                        border: '1px solid var(--color-border, #E4E6DF)',
                        background: '#ffffff',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
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
              </ChartPanel>
            </div>

            {/* Charts Row 2: Priority Distribution & 6-Month Trajectory */}
            <div className="analytics-charts-grid">
              <ChartPanel
                title="Severity & Priority Breakdown"
                description="Distribution of issues classified by risk and urgency level"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0eade" />
                    <XAxis dataKey="name" stroke="var(--color-text, #202824)" />
                    <YAxis stroke="var(--color-secondary, #69736D)" allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '10px',
                        border: '1px solid var(--color-border, #E4E6DF)',
                        background: '#ffffff',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {priorityData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={PRIORITY_COLORS[entry.name] || '#386A91'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartPanel>

              <ChartPanel
                title="6-Month Velocity: Submitted vs Resolved"
                description="Comparative report intake vs successful municipal resolutions over time"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSubmitted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#24483D" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#24483D" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#287A52" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#287A52" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0eade" />
                    <XAxis dataKey="name" stroke="var(--color-text, #202824)" />
                    <YAxis stroke="var(--color-secondary, #69736D)" allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '10px',
                        border: '1px solid var(--color-border, #E4E6DF)',
                        background: '#ffffff',
                        boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                      }}
                    />
                    <Legend verticalAlign="top" height={36} />
                    <Area
                      type="monotone"
                      dataKey="Submitted"
                      stroke="#24483D"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorSubmitted)"
                    />
                    <Area
                      type="monotone"
                      dataKey="Resolved"
                      stroke="#287A52"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorResolved)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartPanel>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
