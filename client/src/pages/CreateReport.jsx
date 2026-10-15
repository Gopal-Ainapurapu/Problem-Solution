import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api';

export default function CreateReport() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'garbage',
    address: '',
    latitude: '',
    longitude: '',
  });

  const [loading, setLoading] = useState(false);

  const updateField = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submit = async (e) => {
    e.preventDefault();

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
      toast.error('Enter valid latitude and longitude');
      return;
    }

    setLoading(true);

    try {
      await api.post('/reports', {
        title: form.title,
        description: form.description,
        category: form.category,
        address: form.address,
        location: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
      });

      toast.success('Report created successfully');
      navigate('/reports');
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to create report'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ maxWidth: 600, margin: '40px auto', padding: 20 }}>
      <Link to="/reports">← Back to reports</Link>

      <h1>Report a Community Issue</h1>

      <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
        <label>
          Title
          <input
            name="title"
            value={form.title}
            onChange={updateField}
            maxLength={120}
            required
          />
        </label>

        <label>
          Description
          <textarea
            name="description"
            value={form.description}
            onChange={updateField}
            rows={4}
            required
          />
        </label>

        <label>
          Category
          <select name="category" value={form.category} onChange={updateField}>
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

        <label>
          Address
          <input
            name="address"
            value={form.address}
            onChange={updateField}
          />
        </label>

        <label>
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
          />
        </label>

        <label>
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
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Report'}
        </button>
      </form>
    </main>
  );
}