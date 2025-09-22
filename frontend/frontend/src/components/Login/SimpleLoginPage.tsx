import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const SimpleLoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const success = await login(email, password);
    if (!success) {
      setError('Invalid credentials. Try demo users with password: demo123');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--color-gray-50)' }}>
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mb-6">
            <h1 className="text-4xl font-bold mb-2">
              <span className="brand-gradient">Asset</span>
              <span style={{ color: 'var(--color-gray-950)' }}> Management</span>
            </h1>
            <div className="w-16 h-1 mx-auto" style={{ background: 'linear-gradient(90deg, var(--color-primary-500), var(--color-success-500))' }}></div>
          </div>
          <h2 className="text-heading-3" style={{ color: 'var(--color-gray-700)' }}>
            Welcome back
          </h2>
          <p className="text-body-sm mt-2">
            Sign in to access your dashboard
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="input-primary"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="input-primary"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div style={{
              backgroundColor: 'var(--color-error-50)',
              borderColor: 'var(--color-error-200)',
              color: 'var(--color-error-700)'
            }} className="border px-3 py-2 rounded-md text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Signing in...
              </div>
            ) : (
              'Sign In'
            )}
          </button>

          <div className="mt-6 p-4 rounded-md card">
            <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-gray-900)' }}>
              <span className="brand-accent">Demo Accounts</span>
            </h3>
            <div className="text-xs space-y-2" style={{ color: 'var(--color-gray-600)' }}>
              <div className="flex items-center justify-between">
                <span>• admin@company.com</span>
                <span className="text-xs px-2 py-0.5 rounded" style={{
                  backgroundColor: 'var(--color-primary-100)',
                  color: 'var(--color-primary-700)'
                }}>Admin</span>
              </div>
              <div className="flex items-center justify-between">
                <span>• teamlead@company.com</span>
                <span className="text-xs px-2 py-0.5 rounded" style={{
                  backgroundColor: 'var(--color-success-100)',
                  color: 'var(--color-success-700)'
                }}>Team Lead</span>
              </div>
              <div className="flex items-center justify-between">
                <span>• employee@company.com</span>
                <span className="text-xs px-2 py-0.5 rounded" style={{
                  backgroundColor: 'var(--color-warning-100)',
                  color: 'var(--color-warning-700)'
                }}>Employee</span>
              </div>
              <div className="pt-2 border-t" style={{ borderColor: 'var(--color-gray-200)' }}>
                <p className="font-medium" style={{ color: 'var(--color-gray-700)' }}>Password: demo123</p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SimpleLoginPage;