import React, { ReactNode } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface SimpleLayoutProps {
  children: ReactNode;
}

const SimpleLayout: React.FC<SimpleLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
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
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-gray-50)' }}>
      {/* Header */}
      <header className="bg-white border-b shadow-sm" style={{ borderColor: 'var(--color-gray-200)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo & Title */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
                background: 'linear-gradient(135deg, var(--color-primary-500), var(--color-success-500))'
              }}>
                <span className="text-white font-bold text-sm">AM</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold" style={{ color: 'var(--color-gray-950)' }}>
                  <span className="brand-accent">Asset</span> Management
                </h1>
                <p className="text-xs" style={{ color: 'var(--color-gray-500)' }}>
                  Powered by Profico
                </p>
              </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center space-x-4">
              {/* User Info */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-sm font-medium" style={{ color: 'var(--color-gray-900)' }}>
                    {user?.name}
                  </div>
                  <div className="text-xs capitalize" style={{ color: 'var(--color-gray-500)' }}>
                    {user?.role}
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{
                  backgroundColor: 'var(--color-primary-100)'
                }}>
                  <span className="text-sm font-medium" style={{ color: 'var(--color-primary-700)' }}>
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Sign Out */}
              <button
                onClick={logout}
                className="text-sm px-3 py-2 rounded-lg transition-colors btn-secondary"
                style={{ color: 'var(--color-gray-600)' }}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b shadow-sm" style={{ borderColor: 'var(--color-gray-200)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 h-14 items-center">
            {navigationItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative
                  focus:outline-none
                  ${isActive(item.path)
                    ? 'text-white'
                    : 'hover:bg-gray-50'
                  }
                `}
                style={isActive(item.path) ? {
                  backgroundColor: 'var(--color-primary-500)',
                  color: 'white'
                } : {
                  color: 'var(--color-gray-600)'
                }}
              >
                {item.label}
                {isActive(item.path) && (
                  <div
                    className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)' }}
                  ></div>
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
      <footer className="bg-white border-t mt-auto" style={{ borderColor: 'var(--color-gray-200)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center text-sm" style={{ color: 'var(--color-gray-500)' }}>
            <div>© 2025 Asset Management System. All rights reserved.</div>
            <div className="flex space-x-4">
              <span>Version 1.0.0</span>
              <span>•</span>
              <span className="brand-accent">Powered by Profico</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SimpleLayout;