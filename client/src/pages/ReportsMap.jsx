import { useEffect, useMemo, useState } from 'react';
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
import 'leaflet.heat';
import api from '../api';
import Navbar from '../components/Navbar';
import './ReportsMap.css';

const DEFAULT_CENTER = [20.5937, 78.9629];

const STATUS_COLORS = {
  pending: '#A96816',
  verified: '#386A91',
  assigned: '#593A8B',
  'in-progress': '#C49A55',
  resolved: '#287A52',
  rejected: '#B83A3A',
};

function MapView({ reports }) {
  const map = useMap();

  useEffect(() => {
    if (reports.length === 1) {
      const [longitude, latitude] = reports[0].location.coordinates;
      map.setView([Number(latitude), Number(longitude)], 14);
      return;
    }

    if (reports.length > 1) {
      const coordinates = reports.map((report) => {
        const [longitude, latitude] = report.location.coordinates;
        return [Number(latitude), Number(longitude)];
      });

      map.fitBounds(coordinates, {
        padding: [40, 40],
        maxZoom: 14,
      });
    }
  }, [map, reports]);

  return null;
}

function HeatmapLayer({ reports, enabled }) {
  const map = useMap();

  useEffect(() => {
    if (!enabled || reports.length === 0) {
      return undefined;
    }

    const points = reports.map((report) => {
      const [longitude, latitude] = report.location.coordinates;
      return [
        Number(latitude),
        Number(longitude),
        report.status === 'resolved' ? 0.4 : 1,
      ];
    });

    const heatLayer = L.heatLayer(points, {
      radius: 28,
      blur: 22,
      maxZoom: 17,
      minOpacity: 0.35,
      gradient: {
        0.2: '#3B82F6',
        0.4: '#06B6D4',
        0.6: '#247A52',
        0.8: '#FFB454',
        1.0: '#F46B50',
      },
    });

    heatLayer.addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, reports, enabled]);

  return null;
}

export default function ReportsMap() {
  const [reports, setReports] = useState([]);
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [viewMode, setViewMode] = useState('markers');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadReports() {
      try {
        setLoading(true);
        setError('');

        const response = await api.get('/reports', { params: { limit: 50 } });
        const data = response.data.reports || [];

        if (!cancelled) {
          setReports(
            data.filter((report) => {
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
            })
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              'Unable to load map data. Please try again.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadReports();

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
      return matchesCategory && matchesStatus;
    });
  }, [reports, category, status]);

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
            <h1>Community Issues Map</h1>
            <p>
              Displaying {filteredReports.length} location-verified community issues
            </p>
          </div>

          <div className="reports-map-controls">
            {/* View Mode Toggle */}
            <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setViewMode('markers')}
                style={{
                  padding: '8px 14px',
                  border: 'none',
                  background: viewMode === 'markers' ? 'var(--color-primary)' : '#ffffff',
                  color: viewMode === 'markers' ? '#ffffff' : 'var(--color-navy)',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                📍 Markers
              </button>
              <button
                type="button"
                onClick={() => setViewMode('heatmap')}
                style={{
                  padding: '8px 14px',
                  border: 'none',
                  background: viewMode === 'heatmap' ? 'var(--color-primary)' : '#ffffff',
                  color: viewMode === 'heatmap' ? '#ffffff' : 'var(--color-navy)',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                🔥 Heatmap
              </button>
            </div>

            {/* Category Select */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="reports-select"
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

            {/* Status Select */}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="reports-select"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="assigned">Assigned</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </header>

      <div className="reports-map-canvas-container">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px 20px' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 16px' }} />
            <p className="text-muted">Loading interactive map...</p>
          </div>
        ) : error ? (
          <div className="empty-state" style={{ margin: '40px' }}>
            <h3>Map unavailable</h3>
            <p>{error}</p>
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

            <MapView reports={filteredReports} />

            {viewMode === 'heatmap' ? (
              <HeatmapLayer reports={filteredReports} enabled />
            ) : (
              filteredReports.map((report) => {
                const [longitude, latitude] = report.location.coordinates;
                const markerColor =
                  STATUS_COLORS[report.status] || '#F46B50';

                return (
                  <CircleMarker
                    key={report._id}
                    center={[Number(latitude), Number(longitude)]}
                    radius={9}
                    pathOptions={{
                      fillColor: markerColor,
                      fillOpacity: 0.9,
                      color: '#ffffff',
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div>
                        <span
                          className={`status-badge status-${report.status}`}
                          style={{ marginBottom: '6px' }}
                        >
                          {formatLabel(report.status)}
                        </span>
                        <h4 className="map-popup-title">{report.title}</h4>
                        <p className="map-popup-address">
                          📍 {report.address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`}
                        </p>
                        <Link
                          to={`/reports/${report._id}`}
                          className="map-popup-link"
                        >
                          View Report Details →
                        </Link>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })
            )}
          </MapContainer>
        )}
      </div>
    </div>
  );
}
