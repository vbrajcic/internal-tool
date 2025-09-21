import React, { ReactNode } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

interface SimpleLayoutProps {
  children: ReactNode;
}

const SimpleLayout: React.FC<SimpleLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path === '/dashboard' && (location.pathname === '/' || location.pathname === '/dashboard')) return true;
    return location.pathname === path;
  };

  const navigationItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/equipment', label: 'Equipment' },
    { path: '/subscriptions', label: 'Subscriptions' },
    { path: '/requests', label: 'Requests' },
    ...(user?.role === 'admin' ? [{ path: '/admin', label: 'Admin' }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo & Title */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-600 dark:bg-primary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">AM</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
                  Asset Management
                </h1>
                <p className="text-xs text-gray-500 dark:text-slate-400">Enterprise Solution</p>
              </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 border border-gray-300 dark:border-slate-600"
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                <div className="w-4 h-4 relative">
                  {isDark ? (
                    // Light mode icon (sun)
                    <div className="w-full h-full rounded-full bg-yellow-400 relative">
                      <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-0.5 h-1 bg-yellow-400"></div>
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0.5 h-1 bg-yellow-400"></div>
                      <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-1 h-0.5 bg-yellow-400"></div>
                      <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-1 h-0.5 bg-yellow-400"></div>
                    </div>
                  ) : (
                    // Dark mode icon (moon)
                    <div className="w-full h-full rounded-full bg-gray-600 relative overflow-hidden">
                      <div className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-gray-50"></div>
                    </div>
                  )}
                </div>
              </button>

              {/* User Info */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                    {user?.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-slate-400 capitalize">
                    {user?.role}
                  </div>
                </div>
                <div className="w-8 h-8 bg-gray-300 dark:bg-slate-700 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-slate-200">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Sign Out */}
              <button
                onClick={logout}
                className="text-sm text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 h-14 items-center">
            {navigationItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative
                  ${isActive(item.path)
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25 dark:shadow-primary-500/25'
                    : 'text-gray-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-slate-800'
                  }
                `}
              >
                {item.label}
                {isActive(item.path) && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full"></div>
                )}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="transition-all duration-200">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center text-sm text-gray-500 dark:text-slate-400">
            <div>© 2025 Asset Management System. All rights reserved.</div>
            <div className="flex space-x-4">
              <span>Version 1.0.0</span>
              <span>•</span>
              <span>Last updated: September 2025</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SimpleLayout;