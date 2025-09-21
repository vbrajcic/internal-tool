import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

interface DashboardStats {
  equipment: {
    total: number;
    assigned: number;
    available: number;
    broken: number;
  };
  subscriptions: {
    total: number;
    active: number;
    expiringSoon: number;
  };
  requests: {
    pending: number;
    myRequests: number;
    teamRequests?: number;
  };
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user, getAccessTokenSilently } = useAuth0();

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const token = await getAccessTokenSilently();
        const response = await axios.get('/api/dashboard/stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(response.data);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, [getAccessTokenSilently]);

  const userRoles = user?.['https://asset-management.com/roles'] || [];
  const isAdmin = userRoles.includes('Admin');
  const isTeamLead = userRoles.includes('TeamLead');

  if (loading) return <div className="p-6 text-center">Loading dashboard...</div>;
  if (error) return <div className="p-6 text-center text-red-600">{error}</div>;

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user?.name || user?.email}</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats && (
          <>
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Equipment</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.equipment.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Available Equipment</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.equipment.available}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Subscriptions</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.subscriptions.active}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.requests.pending}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              to="/equipment"
              className="flex items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <div className="p-2 bg-blue-500 rounded text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="font-medium">View Equipment</p>
                <p className="text-sm text-gray-600">Browse and manage equipment</p>
              </div>
            </Link>

            <Link
              to="/requests/new"
              className="flex items-center p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <div className="p-2 bg-green-500 rounded text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="font-medium">Request Equipment</p>
                <p className="text-sm text-gray-600">Submit a new equipment request</p>
              </div>
            </Link>

            <Link
              to="/qr-scan"
              className="flex items-center p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <div className="p-2 bg-purple-500 rounded text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="font-medium">Scan QR Code</p>
                <p className="text-sm text-gray-600">Scan equipment QR codes</p>
              </div>
            </Link>

            <Link
              to="/subscriptions"
              className="flex items-center p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
            >
              <div className="p-2 bg-orange-500 rounded text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="font-medium">Subscriptions</p>
                <p className="text-sm text-gray-600">Manage software subscriptions</p>
              </div>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            <div className="flex items-center p-3 border-l-4 border-blue-500 bg-blue-50">
              <div className="ml-3">
                <p className="text-sm font-medium">Equipment Transfer Completed</p>
                <p className="text-xs text-gray-600">MacBook Pro assigned to John Doe</p>
                <p className="text-xs text-gray-500">2 hours ago</p>
              </div>
            </div>

            <div className="flex items-center p-3 border-l-4 border-green-500 bg-green-50">
              <div className="ml-3">
                <p className="text-sm font-medium">Request Approved</p>
                <p className="text-xs text-gray-600">Monitor request approved by team lead</p>
                <p className="text-xs text-gray-500">4 hours ago</p>
              </div>
            </div>

            <div className="flex items-center p-3 border-l-4 border-purple-500 bg-purple-50">
              <div className="ml-3">
                <p className="text-sm font-medium">Invoice Uploaded</p>
                <p className="text-xs text-gray-600">Adobe Creative Suite invoice processed</p>
                <p className="text-xs text-gray-500">1 day ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Role-specific sections */}
      {(isAdmin || isTeamLead) && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">
            {isAdmin ? 'Admin Panel' : 'Team Lead Panel'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {isAdmin && (
              <>
                <Link
                  to="/admin/users"
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <h3 className="font-medium">User Management</h3>
                  <p className="text-sm text-gray-600">Manage users and roles</p>
                </Link>
                <Link
                  to="/admin/reports"
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <h3 className="font-medium">Reports</h3>
                  <p className="text-sm text-gray-600">View system reports</p>
                </Link>
              </>
            )}
            <Link
              to="/requests/review"
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <h3 className="font-medium">Review Requests</h3>
              <p className="text-sm text-gray-600">
                {stats?.requests.teamRequests ? `${stats.requests.teamRequests} pending` : 'No pending requests'}
              </p>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;