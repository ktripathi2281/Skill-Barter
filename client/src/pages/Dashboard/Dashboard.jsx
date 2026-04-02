import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import { Plus, Trash2, Sparkles, Target, BookOpen } from 'lucide-react';
import './Dashboard.css';

const CATEGORIES = [
  'Programming', 'Design', 'Music', 'Language', 'Cooking',
  'Fitness', 'Photography', 'Writing', 'Marketing', 'Finance', 'Other',
];

const LEVELS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

const Dashboard = () => {
  const { user } = useAuth();
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Programming',
    proficiencyLevel: 'Intermediate',
    type: 'offered',
  });

  const fetchSkills = async () => {
    try {
      const { data } = await api.get('/skills/my');
      setSkills(data);
    } catch (err) {
      console.error('Failed to fetch skills:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/skills', formData);
      setFormData({
        name: '',
        description: '',
        category: 'Programming',
        proficiencyLevel: 'Intermediate',
        type: 'offered',
      });
      setShowForm(false);
      fetchSkills();
    } catch (err) {
      console.error('Failed to create skill:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/skills/${id}`);
      fetchSkills();
    } catch (err) {
      console.error('Failed to delete skill:', err);
    }
  };

  const offeredSkills = skills.filter((s) => s.type === 'offered');
  const wantedSkills = skills.filter((s) => s.type === 'wanted');

  if (loading) {
    return <div className="spinner" />;
  }

  return (
    <div className="container animate-fade-in" style={{ padding: '2rem 20px' }}>
      <div className="page-header">
        <h1>
          <Sparkles size={28} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8, color: 'var(--color-accent)' }} />
          Welcome, {user?.name?.split(' ')[0] || 'there'}!
        </h1>
        <p>Manage your skills and find perfect trades</p>
      </div>

      {/* Stats */}
      <div className="dashboard-stats">
        <div className="stat-card glass-card">
          <div className="stat-icon" style={{ background: 'rgba(99, 102, 241, 0.15)' }}>
            <BookOpen size={20} color="#818cf8" />
          </div>
          <div>
            <div className="stat-number">{offeredSkills.length}</div>
            <div className="stat-label">Skills Offered</div>
          </div>
        </div>
        <div className="stat-card glass-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
            <Target size={20} color="#f59e0b" />
          </div>
          <div>
            <div className="stat-number">{wantedSkills.length}</div>
            <div className="stat-label">Skills Wanted</div>
          </div>
        </div>
      </div>

      {/* Add Skill Button */}
      <button
        className="btn btn-primary"
        onClick={() => setShowForm(!showForm)}
        id="btn-add-skill"
        style={{ marginBottom: '1.5rem' }}
      >
        <Plus size={18} />
        {showForm ? 'Cancel' : 'Add New Skill'}
      </button>

      {/* Add Skill Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="skill-form glass-card animate-fade-in" id="skill-form">
          <h3 style={{ marginBottom: '1rem' }}>Add a Skill</h3>

          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Skill Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. React Development"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                id="input-skill-name"
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Type</label>
              <select
                className="form-select"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                id="select-skill-type"
              >
                <option value="offered">I Can Teach</option>
                <option value="wanted">I Want to Learn</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                id="select-skill-category"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Proficiency</label>
              <select
                className="form-select"
                value={formData.proficiencyLevel}
                onChange={(e) => setFormData({ ...formData, proficiencyLevel: e.target.value })}
                id="select-skill-level"
              >
                {LEVELS.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <textarea
              className="form-textarea"
              placeholder="Describe your experience or what you want to learn..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              id="input-skill-description"
            />
          </div>

          <button type="submit" className="btn btn-primary" id="btn-submit-skill">
            <Plus size={16} />
            Add Skill
          </button>
        </form>
      )}

      {/* Skills Grid */}
      <div className="skills-sections">
        <div className="skills-section">
          <h2 className="section-title">
            <BookOpen size={20} />
            Skills I Offer
          </h2>
          {offeredSkills.length === 0 ? (
            <div className="empty-state">
              <p>You haven&apos;t listed any skills yet. Add one above!</p>
            </div>
          ) : (
            <div className="skills-grid">
              {offeredSkills.map((skill) => (
                <div key={skill._id} className="skill-card glass-card animate-slide-in">
                  <div className="skill-card-header">
                    <span className={`badge badge-${skill.category}`}>{skill.category}</span>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleDelete(skill._id)}
                      title="Delete skill"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <h4>{skill.name}</h4>
                  {skill.description && <p className="text-muted" style={{ fontSize: '0.85rem' }}>{skill.description}</p>}
                  <span className="badge badge-success">{skill.proficiencyLevel}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="skills-section">
          <h2 className="section-title">
            <Target size={20} />
            Skills I Want
          </h2>
          {wantedSkills.length === 0 ? (
            <div className="empty-state">
              <p>What do you want to learn? Add skills you&apos;re looking for.</p>
            </div>
          ) : (
            <div className="skills-grid">
              {wantedSkills.map((skill) => (
                <div key={skill._id} className="skill-card glass-card animate-slide-in">
                  <div className="skill-card-header">
                    <span className={`badge badge-${skill.category}`}>{skill.category}</span>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleDelete(skill._id)}
                      title="Delete skill"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <h4>{skill.name}</h4>
                  {skill.description && <p className="text-muted" style={{ fontSize: '0.85rem' }}>{skill.description}</p>}
                  <span className="badge badge-accent">{skill.proficiencyLevel}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
