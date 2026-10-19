
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

const DEFAULT_CENTER = [20.5937, 78.9629];

const STATUS_COLORS = {
  pending: '#f59e0b',
  verified: '#2563eb',
  assigned: '#7c3aed',
  'in-progress': '#ea580c',
  resolved: '#16a34a',
  rejected: '#dc2626',
};

function MapView({ reports }) {
  const map = useMap();

  useEffect(() => {
    if (reports.length === 1) {
      const [longitude, latitude] =
        reports[0].location.coordinates;

      map.setView([Number(latitude), Number(longitude)], 14);
      return;
    }

    if (reports.length > 1) {
      const coordinates = reports.map((report) => {
        const [longitude, latitude] =
          report.location.coordinates;

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
      const [longitude, latitude] =
        report.location.coordinates;

      return [
        Number(latitude),
        Number(longitude),
        report.status === 'resolved' ? 0.5 : 1,
      ];
    });

    const heatLayer = L.heatLayer(points, {
      radius: 28,
      blur: 22,
      maxZoom: 17,
      minOpacity: 0.35,
      gradient: {
        0.2: '#2563eb',
        0.4: '#06b6d4',
        0.6: '#84cc16',
        0.8: '#f59e0b',
        1.0: '#dc2626',
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

        const response = await api.get('/reports');
        const data = response.data.reports || [];

        if (!cancelled) {
          setReports(
            data.filter((report) => {
              const coordinates =
                report.location?.coordinates;

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
              'Unable to load reports. Please try again.'
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
        category === 'all' ||
        report.category === category;

      const matchesStatus =
        status === 'all' ||
        report.status === status;

      return matchesCategory && matchesStatus;
    });
  }, [reports, category, status]);

  const formatLabel = (value = '') =>
    value
      .split('-')
      .map(
        (word) =>
          word.charAt(0).toUpperCase() + word.slice(1)
      )
      .join(' ');

  return (
    <main
      style={{
        maxWidth: 1200,
        margin: '30px auto',
        padding: 20,
        fontFamily: 'Arial, sans-serif',
        color: '#1f2937',
      }}
    >
      <Link to="/reports">← Back to reports</Link>

      <h1>Community Issues Map</h1>

      <p>
        Explore issue locations or identify areas with
        concentrated community reports.
      </p>

      <section
        style={{
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
          margin: '20px 0',
          alignItems: 'end',
        }}
      >
        <label style={{ display: 'grid', gap: 6 }}>
          Category
          <select
            value={category}
            onChange={(event) =>
              setCategory(event.target.value)
            }
            style={{ padding: 10, minWidth: 160 }}
          >
            <option value="all">All categories</option>
            <option value="garbage">Garbage</option>
            <option value="roads">Roads</option>
            <option value="water">Water</option>
            <option value="electricity">Electricity</option>
            <option value="streetlight">Streetlight</option>
            <option value="drainage">Drainage</option>
            <option value="public-safety">Public safety</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          Status
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value)
            }
            style={{ padding: 10, minWidth: 160 }}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="assigned">Assigned</option>
            <option value="in-progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>

        <div style={{ display: 'grid', gap: 6 }}>
          Map view
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => setViewMode('markers')}
              aria-pressed={viewMode === 'markers'}
              style={{
                padding: '10px 14px',
                border: 0,
                borderRadius: 6,
                cursor: 'pointer',
                background:
                  viewMode === 'markers'
                    ? '#1d4ed8'
                    : '#e5e7eb',
                color:
                  viewMode === 'markers'
                    ? '#fff'
                    : '#1f2937',
              }}
            >
              Report Markers
            </button>

            <button
              type="button"
              onClick={() => setViewMode('heatmap')}
              aria-pressed={viewMode === 'heatmap'}
              style={{
                padding: '10px 14px',
                border: 0,
                borderRadius: 6,
                cursor: 'pointer',
                background:
                  viewMode === 'heatmap'
                    ? '#1d4ed8'
                    : '#e5e7eb',
                color:
                  viewMode === 'heatmap'
                    ? '#fff'
                    : '#1f2937',
              }}
            >
              Issue Heatmap
            </button>
          </div>
        </div>

        <p style={{ margin: '0 0 8px' }}>
          Showing <strong>{filteredReports.length}</strong>{' '}
          of <strong>{reports.length}</strong> mapped reports
        </p>
      </section>

      {error && (
        <div
          role="alert"
          style={{
            padding: 12,
            marginBottom: 16,
            background: '#fee2e2',
            color: '#991b1b',
            borderRadius: 8,
          }}
        >
          {error}
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ marginLeft: 12 }}
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <p>Loading community reports...</p>
      ) : (
        <>
          {filteredReports.length === 0 && !error && (
            <p>
              No reports with valid coordinates match these
              filters. Try changing the filters or adding a
              report with a valid location.
            </p>
          )}

          <div
            style={{
              height: 520,
              width: '100%',
              borderRadius: 12,
              overflow: 'hidden',
              border: '1px solid #d1d5db',
            }}
          >
            <MapContainer
              center={DEFAULT_CENTER}
              zoom={5}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapView reports={filteredReports} />

              <HeatmapLayer
                reports={filteredReports}
                enabled={viewMode === 'heatmap'}
              />

              {viewMode === 'markers' &&
                filteredReports.map((report) => {
                  const [longitude, latitude] =
                    report.location.coordinates;

                  const color =
                    STATUS_COLORS[report.status] || '#475569';

                  return (
                    <CircleMarker
                      key={report._id}
                      center={[
                        Number(latitude),
                        Number(longitude),
                      ]}
                      radius={9}
                      pathOptions={{
                        color,
                        fillColor: color,
                        fillOpacity: 0.8,
                        weight: 2,
                      }}
                    >
                      <Popup>
                        <div style={{ minWidth: 190 }}>
                          <strong>{report.title}</strong>

                          <p style={{ margin: '8px 0' }}>
                            <strong>Category:</strong>{' '}
                            {formatLabel(report.category)}
                          </p>

                          <p style={{ margin: '8px 0' }}>
                            <strong>Status:</strong>{' '}
                            {formatLabel(report.status)}
                          </p>

                          {report.address && (
                            <p style={{ margin: '8px 0' }}>
                              <strong>Address:</strong>{' '}
                              {report.address}
                            </p>
                          )}

                          <Link to={`/reports/${report._id}`}>
                            View report details →
                          </Link>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
            </MapContainer>
          </div>

          {viewMode === 'heatmap' ? (
            <section style={{ marginTop: 20 }}>
              <h2>Heatmap legend</h2>
              <p>
                <span style={{ color: '#dc2626' }}>● Red</span>{' '}
                indicates a stronger concentration of reports.
                {' '}
                <span style={{ color: '#f59e0b' }}>● Orange</span>{' '}
                indicates a moderate concentration, while cooler
                colors indicate lower concentrations.
              </p>
              <p style={{ fontSize: 13, color: '#64748b' }}>
                Resolved reports contribute less intensity than
                unresolved reports. Heat intensity is a visual
                estimate, not a measure of severity.
              </p>
            </section>
          ) : (
            <section style={{ marginTop: 20 }}>
              <h2>Map legend — report status</h2>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 14,
                }}
              >
                {Object.entries(STATUS_COLORS).map(
                  ([key, color]) => (
                    <span
                      key={key}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: color,
                          display: 'inline-block',
                        }}
                      />
                      {formatLabel(key)}
                    </span>
                  )
                )}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
