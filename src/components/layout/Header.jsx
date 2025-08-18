import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async (logoutAll = false) => {
    setIsLoggingOut(true);
    try {
      await logout(logoutAll);
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
      setIsProfileOpen(false);
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      'admin': 'text-red-400 bg-red-900/20',
      'manager': 'text-blue-400 bg-blue-900/20',
      'senior_analyst': 'text-purple-400 bg-purple-900/20',
      'analyst': 'text-green-400 bg-green-900/20'
    };
    return colors[role] || 'text-gray-400 bg-gray-900/20';
  };

  const formatRole = (role) => {
    const roleNames = {
      'admin': 'Administrator',
      'manager': 'Manager',
      'senior_analyst': 'Senior Analyst',
      'analyst': 'Analyst'
    };
    return roleNames[role] || role;
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="cerberus-logo text-2xl">
              <span className="text-white">Cerberus</span>{' '}
              <span className="text-brand">IR</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => navigate('/dashboard')}
              className={`nav-link ${isActive('/dashboard') ? 'nav-link-active' : ''}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate('/incidents')}
              className={`nav-link ${isActive('/incidents') ? 'nav-link-active' : ''}`}
            >
              Incidents
            </button>
            <button
              onClick={() => navigate('/analytics')}
              className={`nav-link ${isActive('/analytics') ? 'nav-link-active' : ''}`}
            >
              Analytics
            </button>
            <button
              onClick={() => navigate('/reports')}
              className={`nav-link ${isActive('/reports') ? 'nav-link-active' : ''}`}
            >
              Reports
            </button>
            {user?.role === 'admin' && (
                <button
                onClick={() => navigate('/playbooks')}
                className={`nav-link ${isActive('/playbooks') ? 'nav-link-active' : ''}`}
                >
                    Playbooks Management
                </button>
            )}
          </nav>

          {/* User Profile */}
          <div className="flex items-center space-x-4">
            {/* System Status */}
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-gray-300 text-sm hidden sm:block">System Online</span>
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-3 text-sm rounded-lg p-2 hover:bg-gray-700/50 transition-colors duration-200"
              >
                <div className="text-right hidden sm:block">
                  <div className="text-white font-medium">{user?.full_name}</div>
                  <div className={`text-xs px-2 py-1 rounded-full ${getRoleColor(user?.role)}`}>
                    {formatRole(user?.role)}
                  </div>
                </div>
                <div className="w-8 h-8 bg-cerberus-green rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {user?.full_name?.charAt(0)?.toUpperCase()}
                  </span>
                </div>
                <svg 
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-gray-800 rounded-lg shadow-xl border border-gray-700 py-2 animate-fade-in">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-gray-700">
                    <div className="text-white font-medium">{user?.full_name}</div>
                    <div className="text-gray-400 text-sm">{user?.email}</div>
                    <div className="text-gray-400 text-sm">Department: {user?.department || 'N/A'}</div>
                    <div className={`inline-block text-xs px-2 py-1 rounded-full mt-1 ${getRoleColor(user?.role)}`}>
                      {formatRole(user?.role)}
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        // Handle profile navigation
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Profile Settings
                    </button>
                    
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        // Handle password change
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      Change Password
                    </button>

                    {user?.role === 'admin' && (
                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          // Handle admin panel navigation
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center"
                      >
                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Administration
                      </button>
                    )}
                  </div>

                  {/* Logout Options */}
                  <div className="border-t border-gray-700 pt-2">
                    <button
                      onClick={() => handleLogout(false)}
                      disabled={isLoggingOut}
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center disabled:opacity-50"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      {isLoggingOut ? 'Signing out...' : 'Sign Out'}
                    </button>
                    
                    <button
                      onClick={() => handleLogout(true)}
                      disabled={isLoggingOut}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 flex items-center disabled:opacity-50"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Sign Out All Devices
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation - You can expand this later */}
      <div className="md:hidden">
        {/* Mobile menu implementation can go here */}
      </div>
    </header>
  );
};

export default Header;