
import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api';

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

export default function CreateReport() {
  const navigate = useNavigate();
  const previewUrls = useRef(new Set());

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'garbage',
    address: '',
    latitude: '',
    longitude: '',
  });

  const [selectedImages, setSelectedImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);

  // Clean up preview URLs when the component is unmounted.
  useEffect(() => {
    return () => {
      previewUrls.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });

      previewUrls.current.clear();
    };
  }, []);

  const updateField = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Select, validate, and preview report photos.
  const handleImageSelection = (e) => {
    const files = Array.from(e.target.files || []);

    // Allow selecting the same file again later.
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
        toast.error(`${file.name}: Use JPG, PNG, or WebP images.`);
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
        id: `${file.name}-${file.size}-${file.lastModified}-${preview}`,
        file,
        preview,
      };
    });

    setSelectedImages((prev) => [
      ...prev,
      ...newImages,
    ]);
  };

  // Remove a selected photo and release its preview URL.
  const removeImage = (imageId) => {
    setSelectedImages((prev) => {
      const imageToRemove = prev.find(
        (image) => image.id === imageId
      );

      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview);
        previewUrls.current.delete(imageToRemove.preview);
      }

      return prev.filter((image) => image.id !== imageId);
    });
  };

  // Convert coordinates into a readable address.
  const reverseGeocode = async (latitude, longitude) => {
    setAddressLoading(true);

    try {
      const params = new URLSearchParams({
        format: 'jsonv2',
        lat: String(latitude),
        lon: String(longitude),
        zoom: '18',
        addressdetails: '1',
      });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error('Address lookup failed.');
      }

      const data = await response.json();

      if (!data.display_name) {
        toast.error('No address was found for these coordinates.');
        return;
      }

      setForm((prev) => ({
        ...prev,
        address: data.display_name,
      }));

      toast.success('Address detected successfully!');
    } catch (error) {
      console.error('Reverse geocoding error:', error);

      toast.error(
        'Could not find the address. You can enter it manually.'
      );
    } finally {
      setAddressLoading(false);
    }
  };

  // Detect the current device location.
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser.');
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        setForm((prev) => ({
          ...prev,
          latitude: String(latitude),
          longitude: String(longitude),
        }));

        setLocationLoading(false);

        toast.success('Current coordinates detected.');

        await reverseGeocode(latitude, longitude);
      },
      (error) => {
        setLocationLoading(false);

        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error(
              'Location permission denied. Allow location access in your browser settings.'
            );
            break;

          case error.POSITION_UNAVAILABLE:
            toast.error('Your current location is unavailable.');
            break;

          case error.TIMEOUT:
            toast.error('Location request timed out. Try again.');
            break;

          default:
            toast.error('Unable to detect your location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  // Look up an address for manually entered coordinates.
  const findAddress = () => {
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);

    if (
      form.latitude.trim() === '' ||
      form.longitude.trim() === '' ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      toast.error('Enter valid latitude and longitude first.');
      return;
    }

    reverseGeocode(latitude, longitude);
  };

  // Validate and submit the report and its selected images.
  const submit = async (e) => {
    e.preventDefault();

    if (loading || locationLoading || addressLoading) return;

    const title = form.title.trim();
    const description = form.description.trim();
    const address = form.address.trim();

    if (title.length < 5 || title.length > 120) {
      toast.error('Title must contain 5–120 characters.');
      return;
    }

    if (description.length < 10 || description.length > 3000) {
      toast.error('Description must contain 10–3000 characters.');
      return;
    }

    if (address.length > 300) {
      toast.error('Address cannot exceed 300 characters.');
      return;
    }

    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);

    if (
      form.latitude.trim() === '' ||
      form.longitude.trim() === '' ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      toast.error('Detect your location or enter valid coordinates.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', form.category);
      formData.append('address', address);
      formData.append('latitude', String(latitude));
      formData.append('longitude', String(longitude));

      selectedImages.forEach(({ file }) => {
        formData.append('images', file);
      });

      const response = await api.post('/reports', formData);

      if (response.data?.success === false) {
        toast.error(
          response.data.message || 'Failed to create report.'
        );
        return;
      }

      toast.success('Report created successfully.');
      navigate('/reports');
    } catch (error) {
      console.error(
        'Create report error:',
        error.response?.data || error.message
      );

      const validationErrors = error.response?.data?.errors;

      if (Array.isArray(validationErrors) && validationErrors.length) {
        validationErrors.forEach((item) => {
          toast.error(item.msg || 'Please check your report details.');
        });
      } else {
        toast.error(
          error.response?.data?.message ||
            'Failed to create report. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const busy = loading || locationLoading || addressLoading;

  const buttonStyle = {
    padding: '11px 14px',
    border: 'none',
    borderRadius: 8,
    backgroundColor: '#0f766e',
    color: '#ffffff',
    fontWeight: 600,
    cursor: busy ? 'not-allowed' : 'pointer',
  };

  return (
    <main
      style={{
        maxWidth: 700,
        margin: '40px auto',
        padding: 20,
        fontFamily: 'Arial, sans-serif',
        color: '#1f2937',
      }}
    >
      <Link to="/reports">← Back to reports</Link>

      <h1>Report a Community Issue</h1>

      <p>
        Describe the issue, add photos if available, and provide its
        location so your community can take action.
      </p>

      <form
        onSubmit={submit}
        style={{ display: 'grid', gap: 14 }}
      >
        <label style={{ display: 'grid', gap: 6 }}>
          Title
          <input
            name="title"
            value={form.title}
            onChange={updateField}
            minLength={5}
            maxLength={120}
            required
            placeholder="Enter a short title"
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          Description
          <textarea
            name="description"
            value={form.description}
            onChange={updateField}
            minLength={10}
            maxLength={3000}
            rows={4}
            required
            placeholder="Describe the issue in detail"
          />
        </label>

        <label style={{ display: 'grid', gap: 6 }}>
          Category
          <select
            name="category"
            value={form.category}
            onChange={updateField}
            required
          >
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

        {/* Photo upload section */}
        <section style={photoSectionStyle}>
          <h3 style={{ margin: 0 }}>Report Photos</h3>

          <p style={helperTextStyle}>
            Add up to 5 photos to help explain the issue. JPG, PNG,
            and WebP are supported, with a maximum of 5 MB per photo.
          </p>

          <label style={uploadLabelStyle}>
            <span>📷 Choose Photos</span>

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleImageSelection}
              disabled={busy || selectedImages.length >= MAX_IMAGES}
              style={{ display: 'block', marginTop: 10 }}
            />
          </label>

          <p style={helperTextStyle}>
            {selectedImages.length} of {MAX_IMAGES} photos selected
          </p>

          {selectedImages.length > 0 && (
            <div style={photoGridStyle}>
              {selectedImages.map((image, index) => (
                <div key={image.id} style={photoCardStyle}>
                  <img
                    src={image.preview}
                    alt={`Selected report photo ${index + 1}`}
                    style={previewImageStyle}
                  />

                  <p style={fileNameStyle} title={image.file.name}>
                    {image.file.name}
                  </p>

                  <button
                    type="button"
                    onClick={() => removeImage(image.id)}
                    disabled={busy}
                    style={removeButtonStyle}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={locationSectionStyle}>
          <h3 style={{ margin: 0 }}>Report Location</h3>

          <button
            type="button"
            onClick={getCurrentLocation}
            disabled={busy}
            style={buttonStyle}
          >
            {locationLoading
              ? 'Detecting location...'
              : '📍 Use My Current Location'}
          </button>

          <label style={{ display: 'grid', gap: 6 }}>
            Latitude
            <input
              name="latitude"
              type="number"
              min="-90"
              max="90"
              step="any"
              value={form.latitude}
              onChange={updateField}
              required
              placeholder="Example: 17.3850"
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            Longitude
            <input
              name="longitude"
              type="number"
              min="-180"
              max="180"
              step="any"
              value={form.longitude}
              onChange={updateField}
              required
              placeholder="Example: 78.4867"
            />
          </label>

          <button
            type="button"
            onClick={findAddress}
            disabled={busy}
            style={{
              ...buttonStyle,
              backgroundColor: '#2563eb',
            }}
          >
            {addressLoading ? 'Finding address...' : 'Find Address'}
          </button>

          <label style={{ display: 'grid', gap: 6 }}>
            Street Address
            <textarea
              name="address"
              value={form.address}
              onChange={updateField}
              maxLength={300}
              rows={3}
              placeholder="Address will appear here. You can edit it."
            />
          </label>

          <p style={helperTextStyle}>
            Address lookup uses OpenStreetMap Nominatim. Results may be
            approximate. You can edit the address before submitting.
          </p>
        </section>

        <button
          type="submit"
          disabled={busy}
          style={{
            ...buttonStyle,
            backgroundColor: busy ? '#94a3b8' : '#2563eb',
          }}
        >
          {loading ? 'Submitting report and photos...' : 'Submit Report'}
        </button>
      </form>
    </main>
  );
}

const photoSectionStyle = {
  padding: 16,
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  background: '#fff',
  display: 'grid',
  gap: 12,
};

const uploadLabelStyle = {
  padding: 14,
  border: '1px dashed #94a3b8',
  borderRadius: 8,
  background: '#f8fafc',
};

const photoGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: 12,
};

const photoCardStyle = {
  minWidth: 0,
  padding: 8,
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  background: '#fff',
};

const previewImageStyle = {
  display: 'block',
  width: '100%',
  height: 120,
  objectFit: 'cover',
  borderRadius: 6,
};

const fileNameStyle = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: 12,
};

const removeButtonStyle = {
  width: '100%',
  padding: '7px 10px',
  border: '1px solid #fecaca',
  borderRadius: 6,
  background: '#fef2f2',
  color: '#b91c1c',
  cursor: 'pointer',
};

const locationSectionStyle = {
  padding: 16,
  border: '1px solid #dbeafe',
  borderRadius: 10,
  background: '#f8fafc',
  display: 'grid',
  gap: 12,
};

const helperTextStyle = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.6,
  color: '#64748b',
};
