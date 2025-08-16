import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleHalfStroke } from '@fortawesome/free-solid-svg-icons';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';

export default function ChatHeader({ darkMode, setDarkMode }) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/your-workspace', label: 'Your Workspace' },
    { path: '/group-workspace', label: 'Group Workspaces' },
    { path: '/chat', label: 'Chat' },
  ];

  return (
    <header className={
      `flex justify-between items-center px-8 py-3 min-h-16 ` +
      (darkMode
        ? 'bg-gray-900 text-gray-100'
        : 'bg-white text-slate-900 border-b border-slate-200')
    } style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
      
      {/* Left side - Logo and Navigation */}
      <div className="flex items-center space-x-8">
        <Link to="/" className="text-xl font-medium text-white">
          Simple Chat
        </Link>
        
        <nav className="flex space-x-6">
          {navItems.map(({ path, label }) => (
            <Link
              key={path}
              to={path}
              className={`text-base hover:text-gray-300 transition-colors ${
                location.pathname === path
                  ? (darkMode ? 'text-white font-medium' : 'text-slate-900 font-medium')
                  : (darkMode ? 'text-gray-300' : 'text-slate-600')
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Right side - User controls */}
      <div className="flex items-center space-x-6">
        {/* Admin dropdown */}
        <div className="relative group">
          <button className={`hover:text-gray-300 transition-colors ` + (darkMode ? 'text-gray-300' : 'text-slate-600')}>
            Admin ▼
          </button>
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`flex items-center space-x-2 hover:text-gray-300 transition-colors ` + (darkMode ? 'text-gray-300' : 'text-slate-600')}
        >
          <FontAwesomeIcon icon={faCircleHalfStroke} />
          <span>Dark</span>
        </button>

        {/* User account */}
        <div className="relative group">
          <button className={`hover:text-gray-300 transition-colors ` + (darkMode ? 'text-gray-300' : 'text-slate-600')}>
            My Account ▼
          </button>
        </div>

        {/* Logout */}
        <button 
          onClick={logout}
          className={`hover:text-gray-300 transition-colors ` + (darkMode ? 'text-gray-300' : 'text-slate-600')}
        >
          Logout
        </button>
      </div>
    </header>
  );
}
