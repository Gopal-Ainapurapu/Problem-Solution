import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import api from '../api';
import Navbar from '../components/Navbar';
import './CreateReport.css';

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const customPinIcon = L.divIcon({
  className: 'custom-pin-icon',
  html: '<div style="width:24px;height:24px;background:#24483D;border:3px solid #FFFFFF;border-radius:50%;box-shadow:0 3px 8px rgba(0,0,0,0.35);"></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function MapLocationPicker({ latitude, longitude, onLocationSelect }) {
  const defaultPos = [20.5937, 78.9629];
  const hasCoords =
    latitude &&
    longitude &&
    !Number.isNaN(parseFloat(latitude)) &&
    !Number.isNaN(parseFloat(longitude));
  const currentPos = hasCoords
    ? [parseFloat(latitude), parseFloat(longitude)]
    : defaultPos;

  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  return (
    <>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {hasCoords && <Marker position={currentPos} icon={customPinIcon} />}
      <MapCenterController center={currentPos} hasCoords={Boolean(hasCoords)} />
    </>
  );
}

function MapCenterController({ center, hasCoords }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1] && hasCoords) {
      map.setView(center, 15);
    }
  }, [center, hasCoords, map]);
  return null;
}

export default function CreateReport() {
  const navigate = useNavigate();
  const previewUrls = useRef(new Set());

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'garbage',
    priority: 'medium',
    address: '',
    latitude: '',
    longitude: '',
  });

  const [selectedImages, setSelectedImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  // Clean up preview URLs when component is unmounted.
  useEffect(() => {
    const urls = previewUrls.current;
    return () => {
      urls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      urls.clear();
    };
  }, []);

  const updateField = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageSelection = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';

    if (files.length === 0) return;

    const remainingSlots = MAX_IMAGES - selectedImages.length;
    if (remainingSlots <= 0) {
      toast.error(`You can upload a maximum of ${MAX_IMAGES} photos.`);
      return;
    }

    const validFiles = [];
    for (const file of files) {
      if (validFiles.length >= remainingSlots) {
        toast.error(`You can upload a maximum of ${MAX_IMAGES} photos.`);
        break;
      }

      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        toast.error(`${file.name}: Only JPG, PNG, and WebP images are allowed.`);
        continue;
      }

      if (file.size > MAX_IMAGE_SIZE) {
        toast.error(`${file.name}: Image size must not exceed 5 MB.`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    const newImages = validFiles.map((file) => {
      const preview = URL.createObjectURL(file);
      previewUrls.current.add(preview);

      return {
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        file,
        preview,
      };
    });

    setSelectedImages((prev) => [...prev, ...newImages]);
  };

  const removeImage = (imageId) => {
    setSelectedImages((prev) => {
      const imageToRemove = prev.find((image) => image.id === imageId);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview);
        previewUrls.current.delete(imageToRemove.preview);
      }
      return prev.filter((image) => image.id !== imageId);
    });
  };

  const handleMapLocationSelect = async (lat, lon) => {
    setForm((prev) => ({
      ...prev,
      latitude: lat.toFixed(6),
      longitude: lon.toFixed(6),
    }));

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
      );
      const data = await res.json();
      if (data?.display_name) {
        setForm((prev) => ({
          ...prev,
          address: data.display_name,
        }));
      }
    } catch {
      // Coordinates set
    }
    toast.success('Coordinates pinned on map.');
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        setForm((prev) => ({
          ...prev,
          latitude: lat.toFixed(6),
          longitude: lon.toFixed(6),
        }));

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
          );
          const data = await res.json();
          if (data && data.display_name) {
            setForm((prev) => ({
              ...prev,
              address: data.display_name,
            }));
          }
        } catch {
          // If reverse geocoding fails, coordinates are still set
        } finally {
          setLocationLoading(false);
          toast.success('Location detected successfully.');
        }
      },
      () => {
        setLocationLoading(false);
        toast.error('Unable to retrieve your location. Check browser permissions.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  const submit = async (e) => {
    e.preventDefault();

    const lat = parseFloat(form.latitude);
    const lon = parseFloat(form.longitude);

    if (
      Number.isNaN(lat) ||
      Number.isNaN(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      toast.error('Please provide valid geographic coordinates or use Auto-Detect.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', form.title.trim());
      formData.append('description', form.description.trim());
      formData.append('category', form.category);
      formData.append('priority', form.priority);
      formData.append('address', form.address.trim());
      formData.append('latitude', String(lat));
      formData.append('longitude', String(lon));

      selectedImages.forEach((img) => {
        formData.append('images', img.file);
      });

      const response = await api.post('/reports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Report submitted successfully!');
      const newId = response.data?.report?._id;
      navigate(newId ? `/reports/${newId}` : '/citizen');
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Failed to submit the report. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-report-page">
      <Navbar />

      <main className="create-report-container">
        <Link to="/reports" className="create-report-back">
          ← Back to community reports
        </Link>

        <section className="create-report-card">
          <header className="create-report-header">
            <span className="create-report-eyebrow">
              <span aria-hidden="true">◎</span> Public Submission
            </span>
            <h1>Report a Community Issue</h1>
            <p>
              Spot an issue in your neighbourhood? Provide details and photos so municipal teams and community volunteers can take action.
            </p>
          </header>

          <form onSubmit={submit} className="stack">
            {/* Title */}
            <div className="form-group">
              <label htmlFor="report-title" className="field-label">
                Issue Title *
              </label>
              <input
                id="report-title"
                name="title"
                type="text"
                required
                minLength={5}
                maxLength={120}
                value={form.title}
                onChange={updateField}
                className="form-control"
                placeholder="e.g. Broken streetlight on 4th Main Road"
              />
              <span className="form-help">Between 5 and 120 characters</span>
            </div>

            {/* Description */}
            <div className="form-group">
              <label htmlFor="report-desc" className="field-label">
                Detailed Description *
              </label>
              <textarea
                id="report-desc"
                name="description"
                required
                minLength={10}
                maxLength={3000}
                rows={4}
                value={form.description}
                onChange={updateField}
                className="form-control"
                placeholder="Describe the severity, exact landmark, and any hazards..."
              />
              <span className="form-help">Minimum 10 characters</span>
            </div>

            {/* Category & Priority */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
              }}
            >
              <div className="form-group">
                <label htmlFor="report-cat" className="field-label">
                  Issue Category *
                </label>
                <select
                  id="report-cat"
                  name="category"
                  value={form.category}
                  onChange={updateField}
                  className="form-control"
                  required
                >
                  <option value="garbage">Garbage / Waste Dump</option>
                  <option value="roads">Road Damage / Potholes</option>
                  <option value="water">Water Supply / Leakage</option>
                  <option value="electricity">Power Grid / Transformer</option>
                  <option value="streetlight">Streetlight Outage</option>
                  <option value="drainage">Drainage / Sewage Clog</option>
                  <option value="public-safety">Public Safety Hazard</option>
                  <option value="other">Other Civic Concern</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="report-prio" className="field-label">
                  Estimated Priority
                </label>
                <select
                  id="report-prio"
                  name="priority"
                  value={form.priority}
                  onChange={updateField}
                  className="form-control"
                >
                  <option value="low">Low (Minor inconvenience)</option>
                  <option value="medium">Medium (Standard civic issue)</option>
                  <option value="high">High (Impacting many residents)</option>
                  <option value="urgent">Urgent (Immediate safety risk)</option>
                </select>
              </div>
            </div>

            {/* Location & Coordinates */}
            <div className="form-group">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <label htmlFor="report-address" className="field-label">
                  Street Address or Landmark
                </label>
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={locationLoading}
                  className="btn btn-sm btn-outline"
                >
                  {locationLoading ? 'Detecting...' : '📍 Auto-Detect Location'}
                </button>
              </div>

              <input
                id="report-address"
                name="address"
                type="text"
                maxLength={300}
                value={form.address}
                onChange={updateField}
                className="form-control"
                placeholder="e.g. Opposite Community Park, 12th Cross"
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '14px',
              }}
            >
              <div className="form-group">
                <label htmlFor="report-lat" className="field-label">
                  Latitude *
                </label>
                <input
                  id="report-lat"
                  name="latitude"
                  type="number"
                  step="any"
                  required
                  value={form.latitude}
                  onChange={updateField}
                  className="form-control"
                  placeholder="e.g. 12.9716"
                />
              </div>

              <div className="form-group">
                <label htmlFor="report-lon" className="field-label">
                  Longitude *
                </label>
                <input
                  id="report-lon"
                  name="longitude"
                  type="number"
                  step="any"
                  required
                  value={form.longitude}
                  onChange={updateField}
                  className="form-control"
                  placeholder="e.g. 77.5946"
                />
              </div>
            </div>

            {/* Interactive Map Pin Picker */}
            <div className="form-group">
              <label className="field-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Interactive Map Picker (Click to drop pin)</span>
                <span style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: 700 }}>
                  {form.latitude && form.longitude ? `📍 ${form.latitude}, ${form.longitude}` : 'Tap map to drop pin'}
                </span>
              </label>

              <div
                style={{
                  height: '260px',
                  width: '100%',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden',
                  border: '1px solid var(--color-border)',
                  boxShadow: 'var(--shadow-xs)',
                }}
              >
                <MapContainer
                  center={[
                    form.latitude && !Number.isNaN(parseFloat(form.latitude))
                      ? parseFloat(form.latitude)
                      : 20.5937,
                    form.longitude && !Number.isNaN(parseFloat(form.longitude))
                      ? parseFloat(form.longitude)
                      : 78.9629,
                  ]}
                  zoom={form.latitude && form.longitude ? 15 : 4}
                  scrollWheelZoom={false}
                  style={{ height: '100%', width: '100%' }}
                >
                  <MapLocationPicker
                    latitude={form.latitude}
                    longitude={form.longitude}
                    onLocationSelect={handleMapLocationSelect}
                  />
                </MapContainer>
              </div>
              <span className="form-help">
                Click anywhere on the map to position the report pin accurately. Landmark and GPS coordinates will sync automatically.
              </span>
            </div>

            {/* Photos Upload */}
            <div className="form-group">
              <label className="field-label">
                Upload Photos (Up to {MAX_IMAGES})
              </label>

              <label className="create-dropzone">
                <span className="create-dropzone-icon" aria-hidden="true">📷</span>
                <span style={{ fontWeight: 700, display: 'block', color: 'var(--color-navy)' }}>
                  Click or drag photos here
                </span>
                <span className="form-help">
                  Supports JPG, PNG, WebP up to 5 MB per photo
                </span>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleImageSelection}
                  disabled={loading || selectedImages.length >= MAX_IMAGES}
                  style={{ display: 'none' }}
                />
              </label>

              {selectedImages.length > 0 && (
                <div className="create-thumbs-grid">
                  {selectedImages.map((image) => (
                    <div key={image.id} className="create-thumb-box">
                      <img
                        src={image.preview}
                        alt="Preview upload"
                        className="create-thumb-img"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(image.id)}
                        className="create-thumb-remove"
                        title="Remove photo"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary auth-submit"
              style={{ width: '100%', marginTop: '12px' }}
            >
              {loading ? 'Uploading & Creating Report...' : 'Submit Community Report →'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
