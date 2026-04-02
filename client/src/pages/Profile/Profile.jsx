import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { User, MapPin, Save, CheckCircle } from 'lucide-react';
import './Profile.css';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    city: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get('/users/profile');
        setFormData({
          name: data.name || '',
          bio: data.bio || '',
          city: data.location?.city || '',
        });
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    try {
      const { data } = await api.put('/users/profile', {
        name: formData.name,
        bio: formData.bio,
        location: {
          city: formData.city,
          coordinates: [0, 0], // In production, use browser geolocation API
        },
      });

      updateUser({
        name: data.name,
        bio: data.bio,
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="spinner" />;

  return (
    <div className="container animate-fade-in" style={{ padding: '2rem 20px' }}>
      <div className="page-header">
        <h1>
          <User size={28} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />
          My Profile
        </h1>
        <p>Manage your personal information</p>
      </div>

      <div className="profile-content">
        <div className="profile-card glass-card">
          {/* Avatar Section */}
          <div className="profile-avatar-section">
            <div className="profile-avatar-large">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} />
              ) : (
                <span>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
              )}
            </div>
            <div>
              <h2>{user?.name}</h2>
              <p className="text-muted">{user?.email}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-group">
              <label className="form-label" htmlFor="profile-name">Display Name</label>
              <input
                id="profile-name"
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="profile-bio">Bio</label>
              <textarea
                id="profile-bio"
                className="form-textarea"
                placeholder="Tell others about yourself and what you're passionate about..."
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={4}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="profile-city">
                <MapPin size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                City
              </label>
              <input
                id="profile-city"
                type="text"
                className="form-input"
                placeholder="e.g. Mumbai, Delhi, Bangalore"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>

            <button
              type="submit"
              className={`btn ${saved ? 'btn-success-solid' : 'btn-primary'}`}
              disabled={saving}
              id="btn-save-profile"
            >
              {saved ? (
                <>
                  <CheckCircle size={16} />
                  Saved!
                </>
              ) : saving ? (
                'Saving...'
              ) : (
                <>
                  <Save size={16} />
                  Save Changes
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
