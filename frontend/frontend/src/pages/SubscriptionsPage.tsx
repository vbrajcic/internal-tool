import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import ActionMenu from '../components/ui/ActionMenu';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import ModalFooter from '../components/ui/ModalFooter';
import {
  EyeIcon,
  PencilIcon,
  StopIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

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
      cost: 8.00,
      billingCycle: 'Monthly',
      startDate: '2023-03-15',
      renewalDate: '2024-03-15',
      manager: 'Team Lead'
    },
    {
      id: '3',
      name: 'Adobe Creative Suite',
      vendor: 'Adobe',
      type: 'License',
      status: 'Active',
      users: 10,
      maxUsers: 15,
      cost: 52.99,
      billingCycle: 'Monthly',
      startDate: '2023-02-01',
      renewalDate: '2024-02-01',
      manager: 'Design Team'
    },
    {
      id: '4',
      name: 'Zoom Pro',
      vendor: 'Zoom',
      type: 'Service',
      status: 'Expired',
      users: 0,
      maxUsers: 25,
      cost: 14.99,
      billingCycle: 'Monthly',
      startDate: '2022-06-01',
      renewalDate: '2023-06-01',
      manager: 'IT Team'
    }
  ]);

  // Filter subscriptions based on user role
  const subscriptions = React.useMemo(() => {
    if (user?.role === 'admin') {
      return allSubscriptions;
    } else if (user?.role === 'teamlead') {
      return allSubscriptions.filter(sub =>
        sub.manager === user.name ||
        sub.manager === 'Team Lead' ||
        sub.manager === 'IT Team'
      );
    } else {
      return allSubscriptions.filter(sub =>
        sub.manager === user?.name ||
        sub.manager === 'Employee User'
      );
    }
  }, [allSubscriptions, user]);

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sub.vendor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'All' || sub.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const canViewCosts = user?.role === 'admin' || user?.role === 'teamlead';


  const handleView = (sub: Subscription) => {
    setSelectedSubscription(sub);
    setShowViewModal(true);
  };

  const handleEdit = (sub: Subscription) => {
    alert(`Edit functionality for ${sub.name} would be implemented here`);
  };

  const handleCancel = (sub: Subscription) => {
    if (window.confirm(`Are you sure you want to cancel "${sub.name}"? This will stop the subscription at the next billing cycle.`)) {
      alert(`Subscription "${sub.name}" has been scheduled for cancellation.`);
    }
  };

  const getSubscriptionActions = (subscription: Subscription) => {
    const actions = [
      {
        id: 'view',
        label: 'View Details',
        icon: <EyeIcon className="h-4 w-4" />,
        onClick: () => handleView(subscription)
      }
    ];

    if (user?.role === 'admin' || user?.role === 'teamlead') {
      actions.push({
        id: 'edit',
        label: 'Edit',
        icon: <PencilIcon className="h-4 w-4" />,
        onClick: () => handleEdit(subscription)
      });

      if (subscription.status === 'Active') {
        actions.push({
          id: 'cancel',
          label: 'Cancel',
          icon: <StopIcon className="h-4 w-4" />,
          onClick: () => handleCancel(subscription)
        });
      }
    }

    return actions;
  };

  const getUsagePercentage = (current: number, max: number) => {
    return Math.round((current / max) * 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'var(--color-error-500)';
    if (percentage >= 75) return 'var(--color-warning-500)';
    return 'var(--color-success-500)';
  };

  return (
    <>
      {/* Add Subscription Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Subscription"
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>
              Service Name
            </label>
            <input type="text" className="input-primary" placeholder="e.g., Microsoft 365" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>
              Vendor
            </label>
            <input type="text" className="input-primary" placeholder="e.g., Microsoft" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>
              Type
            </label>
            <select className="input-primary">
              <option>Software</option>
              <option>Service</option>
              <option>License</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>
              Billing Cycle
            </label>
            <select className="input-primary">
              <option>Monthly</option>
              <option>Yearly</option>
            </select>
          </div>
          {canViewCosts && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>
                Cost per User
              </label>
              <input type="number" step="0.01" className="input-primary" placeholder="0.00" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>
              Max Users
            </label>
            <input type="number" className="input-primary" placeholder="0" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>
              Start Date
            </label>
            <input type="date" className="input-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>
              Renewal Date
            </label>
            <input type="date" className="input-primary" />
          </div>
        </div>

        <ModalFooter>
          <button onClick={() => setShowAddModal(false)} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={() => {
              alert('Subscription added successfully!');
              setShowAddModal(false);
            }}
            className="btn-primary"
          >
            Add Subscription
          </button>
        </ModalFooter>
      </Modal>

      {/* View Subscription Modal */}
      <Modal
        isOpen={showViewModal && !!selectedSubscription}
        onClose={() => setShowViewModal(false)}
        title="Subscription Details"
        size="lg"
      >
        {selectedSubscription && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-gray-500)' }}>
                  Service Name
                </label>
                <div className="text-body font-medium" style={{ color: 'var(--color-gray-900)' }}>
                  {selectedSubscription.name}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-gray-500)' }}>
                  Vendor
                </label>
                <div className="text-body" style={{ color: 'var(--color-gray-900)' }}>
                  {selectedSubscription.vendor}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-gray-500)' }}>
                  Type
                </label>
                <div className="text-body" style={{ color: 'var(--color-gray-900)' }}>
                  {selectedSubscription.type}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-gray-500)' }}>
                  Status
                </label>
                <div className="mt-1">
                  <StatusBadge status={selectedSubscription.status} size="sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-gray-500)' }}>
                  User Usage
                </label>
                <div className="flex items-center space-x-2">
                  <div className="text-body font-medium" style={{ color: 'var(--color-gray-900)' }}>
                    {selectedSubscription.users} / {selectedSubscription.maxUsers} users
                  </div>
                  <div
                    className="text-body-sm px-2 py-1 rounded"
                    style={{
                      backgroundColor: 'var(--color-primary-100)',
                      color: 'var(--color-primary-700)'
                    }}
                  >
                    {getUsagePercentage(selectedSubscription.users, selectedSubscription.maxUsers)}%
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-gray-500)' }}>
                  Billing
                </label>
                <div className="text-body" style={{ color: 'var(--color-gray-900)' }}>
                  {canViewCosts ? `$${selectedSubscription.cost} per user` : 'Cost hidden'} • {selectedSubscription.billingCycle}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-gray-500)' }}>
                  Start Date
                </label>
                <div className="text-body" style={{ color: 'var(--color-gray-900)' }}>
                  {new Date(selectedSubscription.startDate).toLocaleDateString()}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-gray-500)' }}>
                  Renewal Date
                </label>
                <div className="text-body" style={{ color: 'var(--color-gray-900)' }}>
                  {new Date(selectedSubscription.renewalDate).toLocaleDateString()}
                </div>
              </div>
            </div>

            {canViewCosts && (
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-500)' }}>
                  Total Cost
                </label>
                <div className="p-3 rounded-md" style={{
                  backgroundColor: 'var(--color-success-50)',
                  color: 'var(--color-success-700)',
                  border: '1px solid var(--color-success-200)'
                }}>
                  <div className="text-body font-bold">
                    ${(selectedSubscription.cost * selectedSubscription.users).toFixed(2)} / {selectedSubscription.billingCycle.toLowerCase()}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <ModalFooter>
          <button onClick={() => setShowViewModal(false)} className="btn-secondary">
            Close
          </button>
        </ModalFooter>
      </Modal>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-heading-2 text-gray-900 dark:text-slate-100">Software Subscriptions</h1>
            <p className="text-body text-gray-600 dark:text-slate-400 mt-1">Manage and track all software subscriptions and licenses</p>
          </div>
          {(user?.role === 'admin' || user?.role === 'teamlead') && (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary inline-flex items-center space-x-2"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Add Subscription</span>
            </button>
          )}
        </div>

        {/* Filters and Search */}
        <div className="card p-6">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search subscriptions by name, vendor, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 transition-all duration-150"
              />
            </div>
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-w-[120px] transition-all duration-150"
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subscription</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Usage</TableHead>
              {canViewCosts && <TableHead>Cost</TableHead>}
              <TableHead>Renewal Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSubscriptions.map((subscription) => {
              const usagePercentage = getUsagePercentage(subscription.users, subscription.maxUsers);
              return (
                <TableRow key={subscription.id}>
                  <TableCell>
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">{subscription.name}</div>
                      <div className="text-sm text-gray-500 dark:text-slate-400">{subscription.type}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-900 dark:text-slate-100">{subscription.vendor}</span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={subscription.type} size="sm" />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={subscription.status} size="sm" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${usagePercentage}%`,
                            backgroundColor: getUsageColor(usagePercentage)
                          }}
                        />
                      </div>
                      <span className="text-sm text-gray-900 dark:text-slate-100">
                        {subscription.users}/{subscription.maxUsers}
                      </span>
                    </div>
                  </TableCell>
                  {canViewCosts && (
                    <TableCell>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                          ${(subscription.cost * subscription.users).toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-slate-400">
                          {subscription.billingCycle}
                        </div>
                      </div>
                    </TableCell>
                  )}
                  <TableCell>
                    <span className="text-sm text-gray-900 dark:text-slate-100">
                      {new Date(subscription.renewalDate).toLocaleDateString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <ActionMenu
                      actions={getSubscriptionActions(subscription)}
                      align="right"
                      size="sm"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {filteredSubscriptions.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-xl mb-2">📋</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">No subscriptions found</h3>
            <p className="text-gray-500 dark:text-slate-400">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>
    </>
  );
};

export default SubscriptionsPage;