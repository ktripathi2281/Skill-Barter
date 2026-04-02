import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { Search, MapPin, MessageCircle, Filter } from 'lucide-react';
import './Browse.css';

const CATEGORIES = [
  'All', 'Programming', 'Design', 'Music', 'Language', 'Cooking',
  'Fitness', 'Photography', 'Writing', 'Marketing', 'Finance', 'Other',
];

const CITIES = [
  'All Cities', 'Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai',
  'Pune', 'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow',
  'Chandigarh', 'Indore', 'Bhopal', 'Nagpur', 'Kochi',
  'Gurgaon', 'Noida', 'Coimbatore', 'Visakhapatnam',
];

const Browse = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const navigate = useNavigate();

  const fetchUsers = async () => {
    try {
      const params = {};
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (searchTerm) params.search = searchTerm;
      if (selectedCity !== 'All Cities') params.city = selectedCity;

      const { data } = await api.get('/users/browse', { params });
      setUsers(data);
    } catch (err) {
      console.error('Failed to browse users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [selectedCategory, selectedCity]);

  const handleSearch = (e) => {
    e.preventDefault();
    setLoading(true);
    fetchUsers();
  };

  const handleStartConversation = async (userId) => {
    try {
      const { data } = await api.post('/conversations', {
        participantId: userId,
      });
      navigate(`/chat/${data._id}`);
    } catch (err) {
      console.error('Failed to start conversation:', err);
    }
  };

  return (
    <div className="container animate-fade-in" style={{ padding: '2rem 20px' }}>
      <div className="page-header">
        <h1>
          <Search size={28} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />
          Browse Skills
        </h1>
        <p>Discover people near you who want to trade skills</p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="browse-search glass-card" id="browse-search">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="Search by name or skill..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          id="input-browse-search"
        />
        <button type="submit" className="btn btn-primary btn-sm">Search</button>
      </form>

      {/* City Filter */}
      <div className="city-filter" id="city-filter">
        <MapPin size={16} className="text-muted" />
        <select
          className="form-select city-select"
          value={selectedCity}
          onChange={(e) => { setSelectedCity(e.target.value); setLoading(true); }}
          id="select-city-filter"
        >
          {CITIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {selectedCity === 'All Cities' && user?.location?.city && (
          <span className="proximity-hint">
            Showing people in <strong>{user.location.city}</strong> first
          </span>
        )}
      </div>

      {/* Category Filter */}
      <div className="category-filter" id="category-filter">
        <Filter size={16} className="text-muted" />
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`category-chip ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => { setSelectedCategory(cat); setLoading(true); }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Users Grid */}
      {loading ? (
        <div className="spinner" />
      ) : users.length === 0 ? (
        <div className="empty-state">
          <Search size={48} />
          <h3>No users found</h3>
          <p>Try adjusting your search or category filter</p>
        </div>
      ) : (
        <div className="users-grid">
          {users.map((u) => (
            <div key={u._id} className="user-card glass-card animate-fade-in" id={`user-${u._id}`}>
              <div className="user-card-header">
                <div className="user-avatar">
                  {u.avatar ? (
                    <img src={u.avatar} alt={u.name} />
                  ) : (
                    <span>{u.name?.charAt(0)?.toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <h3 className="user-name">{u.name}</h3>
                  {u.location?.city && (
                    <span className="user-location">
                      <MapPin size={12} />
                      {u.location.city}
                    </span>
                  )}
                </div>
              </div>

              {u.bio && <p className="user-bio">{u.bio}</p>}

              {u.skillsOffered?.length > 0 && (
                <div className="user-skills">
                  <span className="skills-label">Offers:</span>
                  <div className="skills-tags">
                    {u.skillsOffered.map((s) => (
                      <span key={s._id} className={`badge badge-${s.category}`}>
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {u.skillsWanted?.length > 0 && (
                <div className="user-skills">
                  <span className="skills-label">Wants:</span>
                  <div className="skills-tags">
                    {u.skillsWanted.map((s) => (
                      <span key={s._id} className="badge badge-accent">
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleStartConversation(u._id)}
                style={{ marginTop: 'auto' }}
              >
                <MessageCircle size={14} />
                Start Trade Chat
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Browse;
