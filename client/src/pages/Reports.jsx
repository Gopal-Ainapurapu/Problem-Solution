import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api';
import Navbar from '../components/Navbar';
import './Reports.css';

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
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  return { latitude, longitude };
}

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchReports = async () => {
      try {
        const response = await api.get('/reports', { params: { limit: 50 } });
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
        toast.success('Reports sorted by distance from your location.');
      },
      (error) => {
        setLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          toast.error(
            'Location permission was denied. Allow location in browser settings.'
          );
        } else {
          toast.error('Unable to fetch your location.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
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
          selectedCategory === 'all' || report.category === selectedCategory;

        const matchesStatus =
          selectedStatus === 'all' || report.status === selectedStatus;

        const matchesPriority =
          selectedPriority === 'all' || report.priority === selectedPriority;

        return matchesSearch && matchesCategory && matchesStatus && matchesPriority;
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
      results.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
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
    selectedPriority,
    sortBy,
    userLocation,
  ]);

  const resetFilters = () => {
    setSearch('');
    setSelectedCategory('all');
    setSelectedStatus('all');
    setSelectedPriority('all');
    setSortBy('newest');
    setUserLocation(null);
  };

  return (
    <div className="reports-page">
      <Navbar />

      <main className="reports-container">
        <header className="reports-header">
          <div className="reports-header-copy">
            <span className="reports-eyebrow">
              <span aria-hidden="true">◎</span> Community Transparency
            </span>
            <h1>Community Reports</h1>
            <p className="reports-header-description">
              Browse, filter, and track neighbourhood issues reported by local residents. See what's being actively resolved.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Link to="/reports-map" className="btn btn-outline">
              🗺️ Map View
            </Link>
            <Link to="/reports/new" className="btn btn-primary">
              + Report an Issue
            </Link>
          </div>
        </header>

        {/* Filter Controls Panel */}
        <section className="reports-controls-panel">
          <div className="reports-search-row">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reports by title, description or address..."
              className="search-input reports-search-input"
            />

            <button
              type="button"
              onClick={handleNearbyClick}
              disabled={locating}
              className={`btn btn-outline ${sortBy === 'nearby' ? 'active' : ''}`}
            >
              {locating ? 'Locating...' : '📍 Near Me'}
            </button>

            {(search || selectedCategory !== 'all' || selectedStatus !== 'all' || selectedPriority !== 'all' || sortBy !== 'newest') && (
              <button
                type="button"
                onClick={resetFilters}
                className="btn btn-outline"
                title="Reset filters"
              >
                ✕ Clear Filters
              </button>
            )}
          </div>

          <div className="reports-filter-row">
            <div className="reports-category-pills">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`category-pill ${selectedCategory === 'all' ? 'active' : ''}`}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
                >
                  {formatCategory(cat)}
                </button>
              ))}
            </div>

            <div className="reports-dropdowns">
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="reports-select"
                aria-label="Filter by priority"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">🚨 Urgent Priority</option>
                <option value="high">⚠️ High Priority</option>
                <option value="medium">⏺ Medium Priority</option>
                <option value="low">⚪ Low Priority</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="reports-select"
                aria-label="Filter by status"
              >
                <option value="all">All Statuses</option>
                {statuses.map((st) => (
                  <option key={st} value={st}>
                    {formatStatus(st)}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="reports-select"
                aria-label="Sort reports"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="title">Sort: Title A–Z</option>
                {userLocation && <option value="nearby">Sort: Closest to Me</option>}
              </select>
            </div>
          </div>
        </section>

        {/* Reports Grid View */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 16px' }} />
            <p className="text-muted">Loading community reports...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="empty-state">
            <h3>No reports match your filters</h3>
            <p>Try searching for a different keyword or resetting your filters.</p>
            <button
              type="button"
              onClick={resetFilters}
              className="btn btn-primary"
              style={{ marginTop: '16px' }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="reports-grid">
            {filteredReports.map((report) => (
              <Link
                key={report._id}
                to={`/reports/${report._id}`}
                className="report-card"
              >
                <div>
                  <div className="report-card-header">
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className="citizen-card-category">
                        {formatCategory(report.category)}
                      </span>
                      {report.priority && (
                        <span className={`priority-badge priority-${report.priority}`}>
                          {report.priority === 'urgent' && '🚨 Urgent'}
                          {report.priority === 'high' && '⚠️ High'}
                          {report.priority === 'medium' && '⏺ Medium'}
                          {report.priority === 'low' && '⚪ Low'}
                        </span>
                      )}
                    </div>
                    <span className={`status-badge status-${report.status || 'pending'}`}>
                      {formatStatus(report.status)}
                    </span>
                  </div>

                  <h3 className="report-card-title">{report.title}</h3>
                  <p className="report-card-description">{report.description}</p>

                  {/* Thumbnail Previews if images exist */}
                  {Array.isArray(report.images) && report.images.length > 0 && (
                    <div className="report-card-images">
                      {report.images.slice(0, 3).map((img, i) => (
                        <img
                          key={i}
                          src={img}
                          alt="Thumbnail preview"
                          className="report-card-thumb"
                        />
                      ))}
                      {report.images.length > 3 && (
                        <div
                          style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '8px',
                            background: '#fff0e4',
                            border: '1px solid var(--color-border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: 'var(--color-primary-dark)',
                          }}
                        >
                          +{report.images.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="report-card-footer">
                  <span title={report.address || 'Address provided'}>
                    📍 {report.address || 'Location on map'}
                  </span>

                  {report.distanceKm !== null && (
                    <span className="report-card-distance">
                      {report.distanceKm < 1
                        ? `${Math.round(report.distanceKm * 1000)} m away`
                        : `${report.distanceKm.toFixed(1)} km away`}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
