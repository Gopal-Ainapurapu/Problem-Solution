
import { useEffect, useMemo, useState } from 'react';
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

const categories = [
  'garbage',
  'roads',
  'water',
  'electricity',
  'streetlight',
  'drainage',
  'public-safety',
  'other',
];

const statuses = [
  'pending',
  'verified',
  'assigned',
  'in-progress',
  'resolved',
  'rejected',
];

// Returns the distance between two coordinates in kilometres.
function calculateDistance(lat1, lon1, lat2, lon2) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const safeA = Math.min(1, Math.max(0, a));

  return (
    2 *
    earthRadiusKm *
    Math.atan2(Math.sqrt(safeA), Math.sqrt(1 - safeA))
  );
}

// Report coordinates are stored as GeoJSON: [longitude, latitude].
function getReportCoordinates(report) {
  const coordinates = report.location?.coordinates;

  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  const [longitude, latitude] = coordinates;

  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  // [0, 0] is a valid geographic coordinate, so do not reject it.
  return { latitude, longitude };
}

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchReports = async () => {
      try {
        const response = await api.get('/reports');
        const data = response.data;

        const reportList = Array.isArray(data)
          ? data
          : Array.isArray(data?.reports)
            ? data.reports
            : [];

        if (!cancelled) {
          setReports(reportList);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error.response?.data?.message || 'Failed to load reports'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchReports();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleNearbyClick = () => {
    if (!navigator.geolocation) {
      toast.error('Location is not supported by this browser.');
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setSortBy('nearby');
        setLocating(false);
        toast.success('Reports sorted by distance.');
      },
      (error) => {
        setLocating(false);

        if (error.code === error.PERMISSION_DENIED) {
          toast.error(
            'Location permission was denied. Allow location access in your browser settings.'
          );
        } else if (error.code === error.TIMEOUT) {
          toast.error('Location request timed out. Please try again.');
        } else {
          toast.error('Unable to get your location. Please try again.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      }
    );
  };

  const filteredReports = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const results = reports
      .filter((report) => {
        const searchableText = [
          report.title,
          report.description,
          report.address,
          report.category,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const matchesSearch =
          !normalizedSearch || searchableText.includes(normalizedSearch);

        const matchesCategory =
          selectedCategory === 'all' ||
          report.category === selectedCategory;

        const matchesStatus =
          selectedStatus === 'all' ||
          report.status === selectedStatus;

        return matchesSearch && matchesCategory && matchesStatus;
      })
      .map((report) => {
        if (!userLocation) {
          return { ...report, distanceKm: null };
        }

        const coordinates = getReportCoordinates(report);

        const distanceKm = coordinates
          ? calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              coordinates.latitude,
              coordinates.longitude
            )
          : null;

        return { ...report, distanceKm };
      });

    if (sortBy === 'nearby' && userLocation) {
      results.sort((a, b) => {
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    } else if (sortBy === 'title') {
      results.sort((a, b) =>
        (a.title || '').localeCompare(b.title || '')
      );
    } else if (sortBy === 'newest') {
      results.sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      );
    }

    return results;
  }, [
    reports,
    search,
    selectedCategory,
    selectedStatus,
    sortBy,
    userLocation,
  ]);

  const resetFilters = () => {
    setSearch('');
    setSelectedCategory('all');
    setSelectedStatus('all');
    setSortBy('newest');
    setUserLocation(null);
  };

  const inputStyle = {
    width: '100%',
    padding: '11px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    background: '#fff',
    color: '#111827',
    fontSize: 14,
    boxSizing: 'border-box',
  };

  const buttonStyle = {
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    background: '#fff',
    color: '#111827',
    cursor: 'pointer',
    fontSize: 14,
  };

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: '40px auto',
        padding: 20,
        fontFamily: 'Arial, sans-serif',
        color: '#111827',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1>Community Reports</h1>
          <p style={{ color: '#6b7280' }}>
            Find, filter and track issues in your community.
          </p>
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

      <section
        style={{
          marginTop: 24,
          padding: 18,
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          background: '#f9fafb',
        }}
      >
        <h2 style={{ fontSize: 18, marginTop: 0 }}>
          Search and filter
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: 14,
          }}
        >
          <label style={{ fontSize: 13, fontWeight: 600 }}>
            Search reports
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, details, address..."
              style={{ ...inputStyle, marginTop: 7 }}
            />
          </label>

          <label style={{ fontSize: 13, fontWeight: 600 }}>
            Category
            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              style={{ ...inputStyle, marginTop: 7 }}
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category.replaceAll('-', ' ')}
                </option>
              ))}
            </select>
          </label>

          <label style={{ fontSize: 13, fontWeight: 600 }}>
            Status
            <select
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
              style={{ ...inputStyle, marginTop: 7 }}
            >
              <option value="all">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll('-', ' ')}
                </option>
              ))}
            </select>
          </label>

          <label style={{ fontSize: 13, fontWeight: 600 }}>
            Sort by
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              style={{ ...inputStyle, marginTop: 7 }}
            >
              <option value="newest">Newest first</option>
              <option value="title">Title (A–Z)</option>
              {userLocation && (
                <option value="nearby">Nearest first</option>
              )}
            </select>
          </label>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            marginTop: 16,
          }}
        >
          <button
            type="button"
            onClick={handleNearbyClick}
            disabled={locating}
            style={{
              ...buttonStyle,
              background: '#0f766e',
              color: '#fff',
              borderColor: '#0f766e',
              opacity: locating ? 0.7 : 1,
            }}
          >
            {locating
              ? 'Getting location...'
              : userLocation
                ? '↻ Refresh nearby location'
                : '📍 Find nearby reports'}
          </button>

          <button
            type="button"
            onClick={resetFilters}
            style={buttonStyle}
          >
            Clear filters
          </button>
        </div>

        {userLocation && (
          <p style={{ color: '#047857', fontSize: 13, marginBottom: 0 }}>
            Location enabled. Reports with coordinates are sorted by distance.
          </p>
        )}
      </section>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          margin: '22px 0 16px',
          color: '#4b5563',
        }}
      >
        <span>
          Showing <strong>{filteredReports.length}</strong> of{' '}
          <strong>{reports.length}</strong> report(s)
        </span>

        {sortBy === 'nearby' && userLocation && (
          <span>Sorted by distance from your location</span>
        )}
      </div>

      {loading ? (
        <p>Loading reports...</p>
      ) : filteredReports.length === 0 ? (
        <section
          style={{
            textAlign: 'center',
            padding: 36,
            border: '1px dashed #d1d5db',
            borderRadius: 12,
          }}
        >
          <h2 style={{ fontSize: 20 }}>No matching reports</h2>
          <p style={{ color: '#6b7280' }}>
            Try another search term or change your filters.
          </p>
          <button type="button" onClick={resetFilters} style={buttonStyle}>
            Clear filters
          </button>
        </section>
      ) : (
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 18,
          }}
        >
          {filteredReports.map((report) => (
            <article
              key={report._id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: 18,
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: '#6b7280',
                    textTransform: 'capitalize',
                  }}
                >
                  {(report.category || 'other').replaceAll('-', ' ')}
                </span>

                <span
                  style={{
                    background: statusColors[report.status] || '#6b7280',
                    color: '#fff',
                    padding: '4px 8px',
                    borderRadius: 20,
                    fontSize: 12,
                    textTransform: 'capitalize',
                  }}
                >
                  {(report.status || 'unknown').replaceAll('-', ' ')}
                </span>
              </div>

              <h2 style={{ fontSize: 20, overflowWrap: 'anywhere' }}>
                {report.title || 'Untitled report'}
              </h2>

              <p
                style={{
                  color: '#4b5563',
                  lineHeight: 1.5,
                  overflowWrap: 'anywhere',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {report.description || 'No description provided.'}
              </p>

              {report.address && (
                <p style={{ overflowWrap: 'anywhere' }}>
                  📍 {report.address}
                </p>
              )}

              {sortBy === 'nearby' && userLocation && (
                <p style={{ color: '#0f766e', fontSize: 14 }}>
                  <strong>Distance:</strong>{' '}
                  {report.distanceKm === null
                    ? 'Location unavailable'
                    : report.distanceKm < 1
                      ? `${Math.round(report.distanceKm * 1000)} m away`
                      : `${report.distanceKm.toFixed(2)} km away`}
                </p>
              )}

              {report.priority && (
                <p>
                  <strong>Priority:</strong> {report.priority}
                </p>
              )}

              <div style={{ marginTop: 'auto', paddingTop: 12 }}>
                <Link to={`/reports/${report._id}`}>
                  View details →
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
