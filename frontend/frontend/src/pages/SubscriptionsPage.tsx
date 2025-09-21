import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface Subscription {
  id: string;
  name: string;
  vendor: string;
  type: 'Software' | 'Service' | 'License';
  status: 'Active' | 'Expired' | 'Cancelled' | 'Pending';
  users: number;
  maxUsers: number;
  cost: number;
  billingCycle: 'Monthly' | 'Yearly';
  startDate: string;
  renewalDate: string;
  manager: string;
}

const SubscriptionsPage: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);

  // Mock subscription data
  const [allSubscriptions] = useState<Subscription[]>([
    {
      id: '1',
      name: 'Microsoft 365',
      vendor: 'Microsoft',
      type: 'Software',
      status: 'Active',
      users: 45,
      maxUsers: 50,
      cost: 12.50,
      billingCycle: 'Monthly',
      startDate: '2023-01-01',
      renewalDate: '2024-01-01',
      manager: 'IT Team'
    },
    {
      id: '2',
      name: 'Slack Professional',
      vendor: 'Slack',
      type: 'Service',
      status: 'Active',
      users: 35,
      maxUsers: 40,
      cost: 8.75,
      billingCycle: 'Monthly',
      startDate: '2023-02-15',
      renewalDate: '2024-02-15',
      manager: 'Team Lead'
    },
    {
      id: '3',
      name: 'Adobe Creative Cloud',
      vendor: 'Adobe',
      type: 'Software',
      status: 'Active',
      users: 12,
      maxUsers: 15,
      cost: 52.99,
      billingCycle: 'Monthly',
      startDate: '2023-03-01',
      renewalDate: '2024-03-01',
      manager: 'Design Team'
    },
    {
      id: '4',
      name: 'Personal Spotify',
      vendor: 'Spotify',
      type: 'Service',
      status: 'Active',
      users: 1,
      maxUsers: 1,
      cost: 9.99,
      billingCycle: 'Monthly',
      startDate: '2023-06-01',
      renewalDate: '2024-06-01',
      manager: 'Employee User'
    },
    {
      id: '5',
      name: 'GitHub Enterprise',
      vendor: 'GitHub',
      type: 'Service',
      status: 'Active',
      users: 20,
      maxUsers: 25,
      cost: 21.00,
      billingCycle: 'Monthly',
      startDate: '2023-01-15',
      renewalDate: '2024-01-15',
      manager: 'Dev Team'
    }
  ]);

  // Filter subscriptions based on user role
  const subscriptions = React.useMemo(() => {
    if (user?.role === 'admin') {
      return allSubscriptions; // Admin sees all subscriptions
    } else if (user?.role === 'teamlead') {
      return allSubscriptions.filter(sub =>
        sub.manager === user.name ||
        sub.manager === 'Team Lead' ||
        sub.manager === 'IT Team'
      ); // TeamLead sees their team's subscriptions
    } else {
      return allSubscriptions.filter(sub =>
        sub.manager === user?.name ||
        sub.manager === 'Employee User'
      ); // Employees see only their own subscriptions
    }
  }, [allSubscriptions, user]);

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sub.vendor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'All' || sub.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Expired': return 'bg-red-100 text-red-800';
      case 'Cancelled': return 'bg-gray-100 text-gray-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUsageColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const totalMonthlyCost = subscriptions
    .filter(sub => sub.status === 'Active')
    .reduce((total, sub) => {
      const monthlyCost = sub.billingCycle === 'Yearly' ? sub.cost / 12 : sub.cost;
      return total + (monthlyCost * sub.users);
    }, 0);

  // Check if user can see cost information (admin and teamlead only)
  const canViewCosts = user?.role === 'admin' || user?.role === 'teamlead';

  const handleView = (sub: Subscription) => {
    setSelectedSubscription(sub);
    setShowViewModal(true);
  };

  const handleEdit = (sub: Subscription) => {
    setSelectedSubscription(sub);
    setShowEditModal(true);
  };

  const handleCancel = (sub: Subscription) => {
    if (window.confirm(`Are you sure you want to cancel "${sub.name}"? This will stop the subscription at the next billing cycle.`)) {
      alert(`Subscription "${sub.name}" has been scheduled for cancellation.`);
      // In a real app, you would update the state or make an API call here
    }
  };

  return (
    <>
      {/* Add Subscription Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-lg w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Subscription</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., Microsoft 365" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., Microsoft" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Software</option>
                  <option>Service</option>
                  <option>License</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Billing Cycle</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Monthly</option>
                  <option>Yearly</option>
                </select>
              </div>
              {canViewCosts && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost per User</label>
                  <input type="number" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.00" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Users</label>
                <input type="number" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Renewal Date</label>
                <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  alert('Subscription added successfully!');
                  setShowAddModal(false);
                }}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Add Subscription
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Subscription Modal */}
      {showViewModal && selectedSubscription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-lg w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Subscription Details</h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Service Name</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedSubscription.name}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Vendor</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedSubscription.vendor}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedSubscription.type}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <div className="mt-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedSubscription.status)}`}>
                      {selectedSubscription.status}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Current Users</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedSubscription.users} / {selectedSubscription.maxUsers}</div>
                </div>
                {canViewCosts && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cost per User</label>
                    <div className="mt-1 text-sm text-gray-900">${selectedSubscription.cost} / {selectedSubscription.billingCycle.toLowerCase()}</div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Date</label>
                  <div className="mt-1 text-sm text-gray-900">{new Date(selectedSubscription.startDate).toLocaleDateString()}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Renewal Date</label>
                  <div className="mt-1 text-sm text-gray-900">{new Date(selectedSubscription.renewalDate).toLocaleDateString()}</div>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Manager</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedSubscription.manager}</div>
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowViewModal(false)}
                className="bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Subscription Modal */}
      {showEditModal && selectedSubscription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-lg w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Subscription</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
                <input type="text" defaultValue={selectedSubscription.name} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                <input type="text" defaultValue={selectedSubscription.vendor} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select defaultValue={selectedSubscription.type} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Software</option>
                  <option>Service</option>
                  <option>License</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select defaultValue={selectedSubscription.status} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="Active">Active</option>
                  <option value="Expired">Expired</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Users</label>
                <input type="number" defaultValue={selectedSubscription.users} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Users</label>
                <input type="number" defaultValue={selectedSubscription.maxUsers} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {canViewCosts && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost per User</label>
                  <input type="number" step="0.01" defaultValue={selectedSubscription.cost} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Billing Cycle</label>
                <select defaultValue={selectedSubscription.billingCycle} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Monthly</option>
                  <option>Yearly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Renewal Date</label>
                <input type="date" defaultValue={selectedSubscription.renewalDate} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
                <input type="text" defaultValue={selectedSubscription.manager} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  alert(`Subscription "${selectedSubscription.name}" updated successfully!`);
                  setShowEditModal(false);
                }}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-light text-gray-900">Subscription Management</h1>
            <p className="text-gray-600">Track and manage all software subscriptions</p>
          </div>
          {(user?.role === 'admin' || user?.role === 'teamlead') && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Add Subscription
            </button>
          )}
        </div>

        {/* Summary Cards */}
        <div className={`grid grid-cols-1 gap-6 ${canViewCosts ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-2xl font-light text-gray-900 mb-1">
              {subscriptions.filter(s => s.status === 'Active').length}
            </div>
            <div className="text-sm font-medium text-gray-900 mb-1">Active Subscriptions</div>
            <div className="text-xs text-gray-500">Currently running</div>
          </div>
          {canViewCosts && (
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-2xl font-light text-gray-900 mb-1">
                ${totalMonthlyCost.toFixed(2)}
              </div>
              <div className="text-sm font-medium text-gray-900 mb-1">Monthly Cost</div>
              <div className="text-xs text-gray-500">Total active subscriptions</div>
            </div>
          )}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-2xl font-light text-gray-900 mb-1">
              {subscriptions.filter(s => new Date(s.renewalDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length}
            </div>
            <div className="text-sm font-medium text-gray-900 mb-1">Expiring Soon</div>
            <div className="text-xs text-gray-500">Within 30 days</div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-2xl font-light text-gray-900 mb-1">
              {subscriptions.reduce((total, s) => total + s.users, 0)}
            </div>
            <div className="text-sm font-medium text-gray-900 mb-1">Total Users</div>
            <div className="text-xs text-gray-500">Across all subscriptions</div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search subscriptions by name or vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>All</option>
                <option>Active</option>
                <option>Expired</option>
                <option>Cancelled</option>
                <option>Pending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Subscriptions List */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
                  {canViewCosts && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Renewal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSubscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{sub.name}</div>
                        <div className="text-sm text-gray-500">{sub.vendor}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sub.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(sub.status)}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm text-gray-900 mr-2">
                          {sub.users}/{sub.maxUsers}
                        </div>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getUsageColor(sub.users, sub.maxUsers)}`}
                            style={{ width: `${(sub.users / sub.maxUsers) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    {canViewCosts && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${sub.cost}/{sub.billingCycle === 'Monthly' ? 'mo' : 'yr'}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(sub.renewalDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleView(sub)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        View
                      </button>
                      {(user?.role === 'admin' || user?.role === 'teamlead') && (
                        <>
                          <button
                            onClick={() => handleEdit(sub)}
                            className="text-green-600 hover:text-green-900 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleCancel(sub)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredSubscriptions.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-xl mb-2">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No subscriptions found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>
    </>
  );
};

export default SubscriptionsPage;