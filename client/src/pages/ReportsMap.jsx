import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Ensure global L is available before leaflet.heat runs in browser
if (typeof window !== 'undefined' && !window.L) {
  window.L = L;
}
import 'leaflet.heat';

import api from '../api';
import Navbar from '../components/Navbar';
import './ReportsMap.css';

const DEFAULT_CENTER = [20.5937, 78.9629]; // Center of India fallback

const STATUS_COLORS = {
  pending: '#A96816',
  verified: '#386A91',
  assigned: '#593A8B',
  'in-progress': '#C49A55',
  resolved: '#287A52',
  rejected: '#B83A3A',
};

const PRIORITY_COLORS = {
  urgent: '#B83A3A',
  high: '#C49A55',
  medium: '#386A91',
  low: '#287A52',
};

function MapView({ reports, centerTrigger }) {
  const map = useMap();

  useEffect(() => {
    if (!reports || reports.length === 0) return;

    if (reports.length === 1) {
      const [longitude, latitude] = reports[0].location.coordinates;
      map.setView([Number(latitude), Number(longitude)], 14);
      return;
    }

    const coordinates = reports
      .map((report) => {
        const coords = report.location?.coordinates;
        if (Array.isArray(coords) && coords.length === 2) {
          return [Number(coords[1]), Number(coords[0])];
        }
        return null;
      })
      .filter(Boolean);

    if (coordinates.length > 0) {
      map.fitBounds(coordinates, {
        padding: [50, 50],
        maxZoom: 15,
      });
    }
  }, [map, reports, centerTrigger]);

  return null;
}

function HeatmapLayer({ reports, enabled, radius, blur }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (layerRef.current) {
      try {
        map.removeLayer(layerRef.current);
      } catch {
        // layer already removed
      }
      layerRef.current = null;
    }

    if (!enabled || !reports || reports.length === 0) {
      return undefined;
    }

    if (typeof L.heatLayer !== 'function') {
      console.warn('L.heatLayer is not registered on Leaflet namespace.');
      return undefined;
    }

    const priorityWeights = {
      urgent: 1.0,
      high: 0.8,
      medium: 0.55,
      low: 0.35,
    };

    const statusFactors = {
      pending: 1.0,
      verified: 0.9,
      assigned: 0.8,
      'in-progress': 0.75,
      resolved: 0.25,
      rejected: 0.1,
    };

    const points = [];
    reports.forEach((report) => {
      const coords = report.location?.coordinates;
      if (!Array.isArray(coords) || coords.length !== 2) return;
      const lng = Number(coords[0]);
      const lat = Number(coords[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const pWeight = priorityWeights[report.priority] ?? 0.55;
      const sFactor = statusFactors[report.status] ?? 0.7;
      const intensity = Math.min(1.0, Math.max(0.15, pWeight * sFactor));

      points.push([lat, lng, intensity]);
    });

    if (points.length === 0) return undefined;

    try {
      const heat = L.heatLayer(points, {
        radius: Number(radius) || 30,
        blur: Number(blur) || 22,
        maxZoom: 17,
        minOpacity: 0.35,
        gradient: {
          0.15: '#386A91',
          0.35: '#287A52',
          0.55: '#C49A55',
          0.75: '#D97706',
          0.95: '#B83A3A',
        },
      });

      heat.addTo(map);
      layerRef.current = heat;
    } catch (err) {
      console.error('Error rendering heatmap layer:', err);
    }

    return () => {
      if (layerRef.current) {
        try {
          map.removeLayer(layerRef.current);
        } catch {
          // ignore
        }
        layerRef.current = null;
      }
    };
  }, [map, reports, enabled, radius, blur]);

  return null;
}

export default function ReportsMap() {
  const [reports, setReports] = useState([]);
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [viewMode, setViewMode] = useState('markers'); // 'markers' | 'heatmap' | 'both'
  const [heatRadius, setHeatRadius] = useState(30);
  const [heatBlur, setHeatBlur] = useState(22);
  const [centerTrigger, setCenterTrigger] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/reports', { params: { limit: 100 } });
      const rawData = response.data?.reports || response.data || [];
      const list = Array.isArray(rawData) ? rawData : [];

      const validList = list.filter((report) => {
        const coordinates = report.location?.coordinates;
        return (
          Array.isArray(coordinates) &&
          coordinates.length === 2 &&
          Number.isFinite(Number(coordinates[0])) &&
          Number.isFinite(Number(coordinates[1])) &&
          Number(coordinates[0]) >= -180 &&
          Number(coordinates[0]) <= 180 &&
          Number(coordinates[1]) >= -90 &&
          Number(coordinates[1]) <= 90
        );
      });

      setReports(validList);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Unable to load map data. Please check connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const response = await api.get('/reports', { params: { limit: 100 } });
        const rawData = response.data?.reports || response.data || [];
        const list = Array.isArray(rawData) ? rawData : [];

        const validList = list.filter((report) => {
          const coordinates = report.location?.coordinates;
          return (
            Array.isArray(coordinates) &&
            coordinates.length === 2 &&
            Number.isFinite(Number(coordinates[0])) &&
            Number.isFinite(Number(coordinates[1])) &&
            Number(coordinates[0]) >= -180 &&
            Number(coordinates[0]) <= 180 &&
            Number(coordinates[1]) >= -90 &&
            Number(coordinates[1]) <= 90
          );
        });

        if (!cancelled) {
          setReports(validList);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              'Unable to load map data. Please check connection and try again.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const matchesCategory =
        category === 'all' || report.category === category;
      const matchesStatus =
        status === 'all' || report.status === status;
      const matchesPriority =
        priority === 'all' || report.priority === priority;

      return matchesCategory && matchesStatus && matchesPriority;
    });
  }, [reports, category, status, priority]);

  // Map Statistics
  const stats = useMemo(() => {
    const total = filteredReports.length;
    const active = filteredReports.filter(
      (r) => ['pending', 'verified', 'assigned', 'in-progress'].includes(r.status)
    ).length;
    const urgent = filteredReports.filter(
      (r) => r.priority === 'urgent' || r.priority === 'high'
    ).length;
    const resolved = filteredReports.filter((r) => r.status === 'resolved').length;
    return { total, active, urgent, resolved };
  }, [filteredReports]);

  const formatLabel = (value = '') =>
    value
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  return (
    <div className="reports-map-page">
      <Navbar />

      <header className="reports-map-header">
        <div className="reports-map-header-inner">
          <div className="reports-map-title">
            <div className="reports-map-badge">
              <span aria-hidden="true">🗺️</span> Geospatial Intelligence
            </div>
            <h1>Civic Issues & Incident Heatmap</h1>
            <p>
              Displaying {filteredReports.length} geocoded neighborhood issues across the municipality.
            </p>
          </div>

          <div className="reports-map-stats-strip">
            <div className="map-stat-pill">
              <span className="map-stat-num">{stats.total}</span>
              <span className="map-stat-txt">Total Mapped</span>
            </div>
            <div className="map-stat-pill">
              <span className="map-stat-num" style={{ color: 'var(--color-gold, #C49A55)' }}>
                {stats.active}
              </span>
              <span className="map-stat-txt">Active Issues</span>
            </div>
            <div className="map-stat-pill">
              <span className="map-stat-num" style={{ color: 'var(--color-error, #B83A3A)' }}>
                {stats.urgent}
              </span>
              <span className="map-stat-txt">Urgent / High</span>
            </div>
            <div className="map-stat-pill">
              <span className="map-stat-num" style={{ color: 'var(--color-success, #287A52)' }}>
                {stats.resolved}
              </span>
              <span className="map-stat-txt">Resolved</span>
            </div>
          </div>
        </div>

        {/* Filter & View Control Bar */}
        <div className="reports-map-filter-bar">
          <div className="reports-map-view-toggle">
            <button
              type="button"
              onClick={() => setViewMode('markers')}
              className={`map-view-btn ${viewMode === 'markers' ? 'active' : ''}`}
            >
              📍 Markers
            </button>
            <button
              type="button"
              onClick={() => setViewMode('heatmap')}
              className={`map-view-btn ${viewMode === 'heatmap' ? 'active' : ''}`}
            >
              🔥 Density Heatmap
            </button>
            <button
              type="button"
              onClick={() => setViewMode('both')}
              className={`map-view-btn ${viewMode === 'both' ? 'active' : ''}`}
            >
              ✨ Both
            </button>
          </div>

          <div className="reports-map-dropdowns">
            {/* Category */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="reports-select"
              aria-label="Filter by category"
            >
              <option value="all">All Categories</option>
              <option value="garbage">Garbage</option>
              <option value="roads">Roads</option>
              <option value="water">Water</option>
              <option value="electricity">Electricity</option>
              <option value="streetlight">Streetlight</option>
              <option value="drainage">Drainage</option>
              <option value="public-safety">Public Safety</option>
              <option value="other">Other</option>
            </select>

            {/* Status */}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="reports-select"
              aria-label="Filter by status"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="assigned">Assigned</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>

            {/* Priority */}
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="reports-select"
              aria-label="Filter by priority"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Reset / Center View Button */}
            <button
              type="button"
              onClick={() => setCenterTrigger((c) => c + 1)}
              className="btn btn-sm btn-outline"
              title="Fit map view to all displayed reports"
              style={{ padding: '7px 12px', fontSize: '13px' }}
            >
              🎯 Fit Bounds
            </button>
          </div>

          {/* Density Controls for Heatmap */}
          {(viewMode === 'heatmap' || viewMode === 'both') && (
            <div className="heatmap-tuning-bar">
              <label>
                Radius: <strong>{heatRadius}px</strong>
                <input
                  type="range"
                  min={15}
                  max={50}
                  value={heatRadius}
                  onChange={(e) => setHeatRadius(Number(e.target.value))}
                  className="heat-range-slider"
                />
              </label>
              <label>
                Blur: <strong>{heatBlur}px</strong>
                <input
                  type="range"
                  min={10}
                  max={35}
                  value={heatBlur}
                  onChange={(e) => setHeatBlur(Number(e.target.value))}
                  className="heat-range-slider"
                />
              </label>
            </div>
          )}
        </div>
      </header>

      <div className="reports-map-canvas-container">
        {loading ? (
          <div className="map-loading-overlay">
            <div className="loading-spinner" />
            <p>Loading interactive municipal map...</p>
          </div>
        ) : error ? (
          <div className="empty-state" style={{ margin: '60px auto', maxWidth: '500px' }}>
            <h3>Map Data Unavailable</h3>
            <p>{error}</p>
            <button
              type="button"
              onClick={loadReports}
              className="btn btn-primary"
              style={{ marginTop: '14px' }}
            >
              ↻ Try Again
            </button>
          </div>
        ) : (
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={5}
            scrollWheelZoom
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapView reports={filteredReports} centerTrigger={centerTrigger} />

            {/* Render Heatmap Layer */}
            {(viewMode === 'heatmap' || viewMode === 'both') && (
              <HeatmapLayer
                reports={filteredReports}
                enabled
                radius={heatRadius}
                blur={heatBlur}
              />
            )}

            {/* Render Circle Markers */}
            {(viewMode === 'markers' || viewMode === 'both') &&
              filteredReports.map((report) => {
                const [longitude, latitude] = report.location.coordinates;
                const markerColor =
                  STATUS_COLORS[report.status] || '#A96816';
                const pColor =
                  PRIORITY_COLORS[report.priority] || '#386A91';

                return (
                  <CircleMarker
                    key={report._id}
                    center={[Number(latitude), Number(longitude)]}
                    radius={report.priority === 'urgent' ? 11 : 9}
                    pathOptions={{
                      fillColor: markerColor,
                      fillOpacity: 0.9,
                      color: report.priority === 'urgent' ? '#B83A3A' : '#ffffff',
                      weight: report.priority === 'urgent' ? 3 : 2,
                    }}
                  >
                    <Popup>
                      <div className="map-popup-card">
                        <div className="map-popup-header-tags">
                          <span
                            className="status-badge"
                            style={{
                              background: `${markerColor}20`,
                              color: markerColor,
                              border: `1px solid ${markerColor}40`,
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                            }}
                          >
                            {formatLabel(report.status)}
                          </span>
                          <span
                            style={{
                              background: `${pColor}20`,
                              color: pColor,
                              border: `1px solid ${pColor}40`,
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              textTransform: 'uppercase',
                            }}
                          >
                            {report.priority || 'medium'}
                          </span>
                        </div>

                        <h4 className="map-popup-title">{report.title}</h4>

                        <div className="map-popup-meta">
                          <span>🏷️ {formatLabel(report.category)}</span>
                          {report.address && (
                            <span title={report.address}>
                              📍 {report.address.length > 50 ? `${report.address.slice(0, 50)}…` : report.address}
                            </span>
                          )}
                        </div>

                        {report.description && (
                          <p className="map-popup-desc">
                            {report.description.length > 90
                              ? `${report.description.slice(0, 90)}…`
                              : report.description}
                          </p>
                        )}

                        <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #E4E6DF' }}>
                          <Link
                            to={`/reports/${report._id}`}
                            className="map-popup-link"
                          >
                            Inspect Report Details →
                          </Link>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
          </MapContainer>
        )}

        {/* Floating Map Legend */}
        <div className="reports-map-floating-legend">
          <div className="legend-title">Issue Status</div>
          <div className="legend-items">
            {Object.entries(STATUS_COLORS).map(([st, color]) => (
              <div key={st} className="legend-item">
                <span className="legend-dot" style={{ background: color }} />
                <span>{formatLabel(st)}</span>
              </div>
            ))}
          </div>
          {viewMode !== 'markers' && (
            <div className="legend-gradient-wrap">
              <div className="legend-title" style={{ marginTop: '8px' }}>Heat Density</div>
              <div className="legend-gradient-bar" />
              <div className="legend-gradient-labels">
                <span>Low</span>
                <span>Moderate</span>
                <span>Critical</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
