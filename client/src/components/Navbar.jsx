import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeftRight,
  LayoutDashboard,
  Search,
  MessageCircle,
  User,
  LogOut,
} from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/browse', label: 'Browse', icon: Search },
    { path: '/chat', label: 'Messages', icon: MessageCircle },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  if (!user) return null;

  return (
    <nav className="navbar glass-card" id="main-navbar">
      <div className="navbar-inner">
        <Link to="/dashboard" className="navbar-brand">
          <ArrowLeftRight size={24} />
          <span>SkillBarter</span>
        </Link>

        <div className="navbar-links">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`navbar-link ${location.pathname === item.path ? 'active' : ''}`}
              id={`nav-${item.label.toLowerCase()}`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <button className="btn btn-ghost btn-sm" onClick={handleLogout} id="btn-logout">
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
