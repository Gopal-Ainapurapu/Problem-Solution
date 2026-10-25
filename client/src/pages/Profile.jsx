import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import './Profile.css';

export default function Profile() {
  const { updateUser } = useAuth();

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    role: '',
    phone: '',
    bio: '',
    profileImage: '',
    isAvailable: false,
    createdAt: null,
  });

  const [form, setForm] = useState({
    name: '',
    phone: '',
    bio: '',
    profileImage: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchProfile() {
      try {
        const response = await api.get('/users/me');
        const user = response.data.user;

        if (!cancelled) {
          setProfile(user);
          setForm({
            name: user.name || '',
            phone: user.phone || '',
            bio: user.bio || '',
            profileImage: user.profileImage || '',
          });
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            error.response?.data?.message || 'Unable to load your profile.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error('Name is required.');
      return;
    }

    setSaving(true);

    try {
      const response = await api.patch('/users/me', {
        name: form.name.trim(),
        phone: form.phone.trim(),
        bio: form.bio.trim(),
        profileImage: form.profileImage.trim(),
      });

      const updatedUser = response.data.user;

      setProfile((previous) => ({
        ...previous,
        ...updatedUser,
      }));

      setForm((previous) => ({
        ...previous,
        name: updatedUser.name ?? previous.name,
        phone: updatedUser.phone ?? previous.phone,
        bio: updatedUser.bio ?? previous.bio,
        profileImage: updatedUser.profileImage ?? previous.profileImage,
      }));

      updateUser(updatedUser);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Unable to update your profile.'
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async () => {
    setUpdatingAvailability(true);
    const newStatus = !profile.isAvailable;

    try {
      await api.patch('/users/me/availability', {
        isAvailable: newStatus,
      });

      setProfile((prev) => ({ ...prev, isAvailable: newStatus }));
      updateUser({ isAvailable: newStatus });
      toast.success(
        newStatus
          ? 'You are now marked as available for assignments!'
          : 'You are now marked as unavailable.'
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Unable to update availability status'
      );
    } finally {
      setUpdatingAvailability(false);
    }
  };

  return (
    <div className="profile-page">
      <Navbar />

      <main className="profile-container">
        <Link to="/" className="profile-back">
          ← Back to home
        </Link>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px 20px' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 16px' }} />
            <p className="text-muted">Loading your profile details...</p>
          </div>
        ) : (
          <article className="profile-card">
            {/* Header banner */}
            <div className="profile-header-banner">
              {form.profileImage ? (
                <img
                  src={form.profileImage}
                  alt={profile.name || 'Profile'}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  className="profile-avatar-large"
                />
              ) : (
                <div className="profile-avatar-placeholder">
                  {(form.name || profile.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}

              <div className="profile-header-info">
                <h1>{profile.name || 'Your Profile'}</h1>
                <p className="profile-header-email">{profile.email}</p>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span className={`role-pill role-${profile.role}`}>
                    {profile.role}
                  </span>
                  {profile.isEmailVerified && (
                    <span style={{ fontSize: '12px', color: 'var(--color-success)', fontWeight: 700 }}>
                      ✓ Email Verified
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Volunteer Availability Toggle (if role === 'volunteer') */}
            {profile.role === 'volunteer' && (
              <div className="profile-volunteer-box">
                <div className="profile-volunteer-copy">
                  <h4>Volunteer Assignment Status</h4>
                  <p>
                    {profile.isAvailable
                      ? 'You are active and available for administrators to assign community reports.'
                      : 'You are currently marked unavailable. Admins will not assign new issues.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={toggleAvailability}
                  disabled={updatingAvailability}
                  className="btn btn-sm btn-primary"
                  style={{
                    backgroundColor: profile.isAvailable ? 'var(--color-success)' : 'var(--color-navy)',
                    borderColor: profile.isAvailable ? 'var(--color-success)' : 'var(--color-navy)',
                  }}
                >
                  {updatingAvailability
                    ? 'Updating...'
                    : profile.isAvailable
                      ? '✓ Available (Click to pause)'
                      : '○ Unavailable (Click to activate)'}
                </button>
              </div>
            )}

            {/* Profile Form */}
            <form onSubmit={handleSubmit} className="profile-form-grid">
              <div className="form-group">
                <label htmlFor="prof-name" className="field-label">
                  Full Name *
                </label>
                <input
                  id="prof-name"
                  name="name"
                  type="text"
                  required
                  maxLength={80}
                  value={form.name}
                  onChange={handleChange}
                  className="form-control"
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '16px',
                }}
              >
                <div className="form-group">
                  <label htmlFor="prof-email" className="field-label">
                    Email Address (Read-only)
                  </label>
                  <input
                    id="prof-email"
                    type="email"
                    value={profile.email || ''}
                    readOnly
                    className="form-control profile-readonly-field"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="prof-role" className="field-label">
                    Account Role (Read-only)
                  </label>
                  <input
                    id="prof-role"
                    type="text"
                    value={profile.role || ''}
                    readOnly
                    className="form-control profile-readonly-field"
                    style={{ textTransform: 'capitalize' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="prof-phone" className="field-label">
                  Mobile Phone Number
                </label>
                <input
                  id="prof-phone"
                  name="phone"
                  type="tel"
                  maxLength={20}
                  value={form.phone}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="+919876543210"
                />
              </div>

              <div className="form-group">
                <label htmlFor="prof-avatar" className="field-label">
                  Profile Image URL
                </label>
                <input
                  id="prof-avatar"
                  name="profileImage"
                  type="url"
                  maxLength={2048}
                  value={form.profileImage}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="https://example.com/photo.jpg"
                />
              </div>

              <div className="form-group">
                <label htmlFor="prof-bio" className="field-label">
                  Bio / Community Description
                </label>
                <textarea
                  id="prof-bio"
                  name="bio"
                  rows={4}
                  maxLength={500}
                  value={form.bio}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="Share a few words about yourself and your neighbourhood involvement..."
                />
                <span className="form-help">
                  {form.bio.length}/500 characters
                </span>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary auth-submit"
                style={{ width: 'fit-content', padding: '12px 28px' }}
              >
                {saving ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </form>
          </article>
        )}
      </main>
    </div>
  );
}
