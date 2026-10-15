
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { updateUser } = useAuth();

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    role: '',
    phone: '',
    bio: '',
    profileImage: '',
  });

  const [form, setForm] = useState({
    name: '',
    phone: '',
    bio: '',
    profileImage: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load the logged-in user's profile.
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
            error.response?.data?.message ||
              'Unable to load your profile.'
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

  // Handle changes to form fields.
  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Save the updated profile.
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

      // Update the profile page.
      setProfile((previous) => ({
        ...previous,
        ...updatedUser,
      }));

      setForm((previous) => ({
        ...previous,
        name: updatedUser.name ?? previous.name,
        phone: updatedUser.phone ?? previous.phone,
        bio: updatedUser.bio ?? previous.bio,
        profileImage:
          updatedUser.profileImage ?? previous.profileImage,
      }));

      // Synchronize the logged-in user across the app.
      updateUser(updatedUser);

      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Unable to update your profile.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <p style={{ padding: 24 }}>
        Loading profile...
      </p>
    );
  }

  return (
    <main style={pageStyle}>
      <Link to="/" style={backLinkStyle}>
        ← Home
      </Link>

      <header style={{ margin: '28px 0' }}>
        <h1>My Profile</h1>
        <p>Manage your LocalLens account information.</p>
      </header>

      <section style={cardStyle}>
        {/* Profile picture and account details */}
        <div style={profileHeaderStyle}>
          {form.profileImage ? (
            <img
              src={form.profileImage}
              alt="Profile"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
              style={avatarStyle}
            />
          ) : (
            <div style={placeholderAvatarStyle}>
              {(form.name || 'U').charAt(0).toUpperCase()}
            </div>
          )}

          <h2>{profile.name || 'Your Profile'}</h2>

          <p style={mutedTextStyle}>
            {profile.email}
          </p>

          <p style={roleStyle}>
            {profile.role}
          </p>
        </div>

        {/* Editable profile form */}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gap: 18 }}>
            <label style={labelStyle}>
              Full name
              <input
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                required
                maxLength={100}
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              Email address
              <input
                type="email"
                value={profile.email || ''}
                readOnly
                style={readOnlyInputStyle}
              />
            </label>

            <label style={labelStyle}>
              Account role
              <input
                type="text"
                value={profile.role || ''}
                readOnly
                style={readOnlyInputStyle}
              />
            </label>

            <label style={labelStyle}>
              Phone number
              <input
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                maxLength={20}
                style={inputStyle}
                placeholder="Enter your phone number"
              />
            </label>

            <label style={labelStyle}>
              Bio
              <textarea
                name="bio"
                value={form.bio}
                onChange={handleChange}
                rows={4}
                maxLength={500}
                placeholder="Tell your community a little about yourself"
                style={{
                  ...inputStyle,
                  resize: 'vertical',
                }}
              />
            </label>

            <label style={labelStyle}>
              Profile image URL
              <input
                name="profileImage"
                type="url"
                value={form.profileImage}
                onChange={handleChange}
                maxLength={1000}
                placeholder="https://example.com/photo.jpg"
                style={inputStyle}
              />
            </label>

            <button
              type="submit"
              disabled={saving}
              style={{
                ...saveButtonStyle,
                opacity: saving ? 0.7 : 1,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

// Styles
const pageStyle = {
  maxWidth: 720,
  margin: '40px auto',
  padding: 24,
  fontFamily: 'Arial, sans-serif',
  color: '#1f2937',
};

const backLinkStyle = {
  color: '#3563e9',
  textDecoration: 'none',
};

const cardStyle = {
  padding: 24,
  border: '1px solid #e2e8f0',
  borderRadius: 14,
  background: '#fff',
};

const profileHeaderStyle = {
  textAlign: 'center',
  marginBottom: 28,
};

const avatarStyle = {
  width: 100,
  height: 100,
  borderRadius: '50%',
  objectFit: 'cover',
  border: '3px solid #e2e8f0',
};

const placeholderAvatarStyle = {
  width: 100,
  height: 100,
  margin: '0 auto',
  borderRadius: '50%',
  background: '#dbeafe',
  color: '#1d4ed8',
  display: 'grid',
  placeItems: 'center',
  fontSize: 36,
  fontWeight: 700,
};

const mutedTextStyle = {
  color: '#64748b',
  margin: 0,
};

const roleStyle = {
  color: '#64748b',
  textTransform: 'capitalize',
};

const labelStyle = {
  display: 'block',
  fontWeight: 600,
};

const inputStyle = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  marginTop: 8,
  padding: 12,
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  fontSize: 15,
  fontFamily: 'inherit',
};

const readOnlyInputStyle = {
  ...inputStyle,
  background: '#f8fafc',
  color: '#64748b',
};

const saveButtonStyle = {
  padding: '12px 18px',
  border: 0,
  borderRadius: 8,
  background: '#3563e9',
  color: '#fff',
  fontWeight: 600,
  fontSize: 15,
};
