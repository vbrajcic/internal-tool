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
  PlusIcon,
  BellIcon,
  CheckIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface EmailTemplate {
  id: string;
  type: '7-day' | '3-day' | 'due-date' | 'overdue';
  subject: string;
  body: string;
  enabled: boolean;
}

interface ReminderSettings {
  enabled: boolean;
  daysAdvance: number[];
  lastInvoiceSubmitted?: string;
  nextInvoiceDue?: string;
  remindersSent: number;
  lastReminderSent?: string;
  emailTemplates?: EmailTemplate[];
}

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
  reminderSettings?: ReminderSettings;
}

const SubscriptionsPage: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showEmailTemplateModal, setShowEmailTemplateModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);

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
      manager: 'IT Team',
      reminderSettings: {
        enabled: true,
        daysAdvance: [7, 3, 0],
        lastInvoiceSubmitted: '2024-08-25',
        nextInvoiceDue: '2024-10-01',
        remindersSent: 1,
        lastReminderSent: '2024-09-24',
        emailTemplates: [
          {
            id: '1',
            type: '7-day',
            subject: 'Invoice Due Reminder - {{subscriptionName}} (7 days)',
            body: 'Dear {{managerName}},\n\nThis is a friendly reminder that the invoice for {{subscriptionName}} is due in 7 days ({{dueDate}}).\n\nPlease submit your invoice at your earliest convenience to avoid any service interruptions.\n\nBest regards,\nIT Team',
            enabled: true
          },
          {
            id: '2',
            type: '3-day',
            subject: 'Urgent: Invoice Due Soon - {{subscriptionName}} (3 days)',
            body: 'Dear {{managerName}},\n\nThis is an urgent reminder that the invoice for {{subscriptionName}} is due in 3 days ({{dueDate}}).\n\nImmediate action required to prevent service interruption.\n\nBest regards,\nIT Team',
            enabled: true
          },
          {
            id: '3',
            type: 'due-date',
            subject: 'Invoice Due Today - {{subscriptionName}}',
            body: 'Dear {{managerName}},\n\nThe invoice for {{subscriptionName}} is due today ({{dueDate}}).\n\nPlease submit immediately to maintain service continuity.\n\nBest regards,\nIT Team',
            enabled: true
          },
          {
            id: '4',
            type: 'overdue',
            subject: 'OVERDUE: Invoice Required - {{subscriptionName}}',
            body: 'Dear {{managerName}},\n\nThe invoice for {{subscriptionName}} is now OVERDUE (was due {{dueDate}}).\n\nService may be suspended without immediate payment. Please contact us urgently.\n\nBest regards,\nIT Team',
            enabled: true
          }
        ]
      }
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
      manager: 'Team Lead',
      reminderSettings: {
        enabled: true,
        daysAdvance: [7, 3, 0],
        nextInvoiceDue: '2024-10-15',
        remindersSent: 0,
        emailTemplates: [
          {
            id: '5',
            type: '7-day',
            subject: 'Invoice Due Reminder - {{subscriptionName}} (7 days)',
            body: 'Dear {{managerName}},\n\nThis is a friendly reminder that the invoice for {{subscriptionName}} is due in 7 days ({{dueDate}}).\n\nPlease submit your invoice at your earliest convenience to avoid any service interruptions.\n\nBest regards,\nIT Team',
            enabled: true
          }
        ]
      }
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

  const handleManageReminders = (sub: Subscription) => {
    setSelectedSubscription(sub);
    setShowReminderModal(true);
  };

  const handleMarkInvoiceSubmitted = (sub: Subscription) => {
    alert(`Invoice for "${sub.name}" marked as submitted. Next reminder will be scheduled based on billing cycle.`);
  };

  const handleManageEmailTemplates = (sub: Subscription) => {
    setSelectedSubscription(sub);
    setShowEmailTemplateModal(true);
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
  };

  const getTemplateTypeLabel = (type: EmailTemplate['type']) => {
    switch (type) {
      case '7-day': return '7 Days Before';
      case '3-day': return '3 Days Before';
      case 'due-date': return 'Due Date';
      case 'overdue': return 'Overdue';
      default: return type;
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

      // Reminder management actions
      if (subscription.status === 'Active') {
        actions.push({
          id: 'manage-reminders',
          label: 'Manage Reminders',
          icon: <BellIcon className="h-4 w-4" />,
          onClick: () => handleManageReminders(subscription)
        });

        if (subscription.reminderSettings?.nextInvoiceDue) {
          actions.push({
            id: 'mark-submitted',
            label: 'Mark Invoice Submitted',
            icon: <CheckIcon className="h-4 w-4" />,
            onClick: () => handleMarkInvoiceSubmitted(subscription)
          });
        }

        actions.push({
          id: 'email-templates',
          label: 'Email Templates',
          icon: <BellIcon className="h-4 w-4" />,
          onClick: () => handleManageEmailTemplates(subscription)
        });

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

  const getReminderStatus = (subscription: Subscription) => {
    if (!subscription.reminderSettings?.enabled) {
      return { status: 'disabled', label: 'Disabled', color: 'gray' };
    }

    const nextDue = subscription.reminderSettings.nextInvoiceDue;
    if (!nextDue) {
      return { status: 'no-due-date', label: 'No Due Date', color: 'gray' };
    }

    const dueDate = new Date(nextDue);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

    if (daysUntilDue < 0) {
      return { status: 'overdue', label: 'Overdue', color: 'error' };
    } else if (daysUntilDue <= 3) {
      return { status: 'due-soon', label: 'Due Soon', color: 'warning' };
    } else if (daysUntilDue <= 7) {
      return { status: 'upcoming', label: 'Upcoming', color: 'primary' };
    } else {
      return { status: 'scheduled', label: 'Scheduled', color: 'success' };
    }
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

      {/* Reminder Settings Modal */}
      <Modal
        isOpen={showReminderModal && !!selectedSubscription}
        onClose={() => setShowReminderModal(false)}
        title="Invoice Reminder Settings"
        size="lg"
      >
        {selectedSubscription && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <BellIcon className="h-5 w-5 text-blue-600" />
                <h3 className="font-medium text-blue-900">
                  Automated Invoice Reminders for {selectedSubscription.name}
                </h3>
              </div>
              <p className="text-sm text-blue-700">
                Configure when reminders are sent to subscription managers for invoice submission
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-gray-700)' }}>
                    Enable Automatic Reminders
                  </label>
                  <p className="text-xs text-gray-500">
                    Automatically send email reminders based on billing cycle
                  </p>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedSubscription.reminderSettings?.enabled || false}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    readOnly
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>
                  Reminder Schedule
                </label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <ClockIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">7 days before due date</span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Active</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ClockIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">3 days before due date</span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Active</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <ClockIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">On due date</span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Active</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>
                  Current Status
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Next Invoice Due:</span>
                    <div className="font-medium">
                      {selectedSubscription.reminderSettings?.nextInvoiceDue
                        ? new Date(selectedSubscription.reminderSettings.nextInvoiceDue).toLocaleDateString()
                        : 'Not set'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Last Invoice Submitted:</span>
                    <div className="font-medium">
                      {selectedSubscription.reminderSettings?.lastInvoiceSubmitted
                        ? new Date(selectedSubscription.reminderSettings.lastInvoiceSubmitted).toLocaleDateString()
                        : 'Never'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Reminders Sent:</span>
                    <div className="font-medium">
                      {selectedSubscription.reminderSettings?.remindersSent || 0} this cycle
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Last Reminder:</span>
                    <div className="font-medium">
                      {selectedSubscription.reminderSettings?.lastReminderSent
                        ? new Date(selectedSubscription.reminderSettings.lastReminderSent).toLocaleDateString()
                        : 'Never'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <ModalFooter>
          <button onClick={() => setShowReminderModal(false)} className="btn-secondary">
            Close
          </button>
          <button className="btn-primary">
            Save Settings
          </button>
        </ModalFooter>
      </Modal>

      {/* Email Template Management Modal */}
      <Modal
        isOpen={showEmailTemplateModal && !!selectedSubscription}
        onClose={() => {
          setShowEmailTemplateModal(false);
          setSelectedTemplate(null);
        }}
        title="Email Template Management"
        size="xl"
      >
        {selectedSubscription && (
          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <BellIcon className="h-5 w-5 text-blue-600" />
                <h3 className="font-medium text-blue-900">
                  Email Templates for {selectedSubscription.name}
                </h3>
              </div>
              <p className="text-sm text-blue-700">
                Customize email templates for different reminder stages. Use variables like {'{subscriptionName}'}, {'{managerName}'}, and {'{dueDate}'}
              </p>
            </div>

            {!selectedTemplate ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Available Templates</h3>
                  <button
                    onClick={() => setSelectedTemplate({
                      id: 'new',
                      type: '7-day',
                      subject: '',
                      body: '',
                      enabled: true
                    })}
                    className="btn-primary text-sm"
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Add Template
                  </button>
                </div>

                <div className="grid gap-4">
                  {(selectedSubscription.reminderSettings?.emailTemplates || []).map((template) => (
                    <div key={template.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <StatusBadge
                            status={getTemplateTypeLabel(template.type)}
                            size="sm"
                          />
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs px-2 py-1 rounded ${
                              template.enabled
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {template.enabled ? 'Active' : 'Disabled'}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleEditTemplate(template)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Edit
                        </button>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs text-gray-500 font-medium">Subject:</span>
                          <p className="text-sm text-gray-900 truncate">{template.subject}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 font-medium">Body Preview:</span>
                          <p className="text-sm text-gray-700 line-clamp-2">
                            {template.body.substring(0, 100)}{template.body.length > 100 ? '...' : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedTemplate.id === 'new' ? 'Create New Template' : 'Edit Template'}
                  </h3>
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ← Back to Templates
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>
                      Template Type
                    </label>
                    <select
                      value={selectedTemplate.type}
                      className="input-primary"
                      onChange={(e) => setSelectedTemplate({...selectedTemplate, type: e.target.value as EmailTemplate['type']})}
                    >
                      <option value="7-day">7 Days Before</option>
                      <option value="3-day">3 Days Before</option>
                      <option value="due-date">Due Date</option>
                      <option value="overdue">Overdue</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTemplate.enabled}
                        onChange={(e) => setSelectedTemplate({...selectedTemplate, enabled: e.target.checked})}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Enable Template</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={selectedTemplate.subject}
                    onChange={(e) => setSelectedTemplate({...selectedTemplate, subject: e.target.value})}
                    className="input-primary"
                    placeholder="e.g., Invoice Due Reminder - {{subscriptionName}}"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>
                    Email Body
                  </label>
                  <textarea
                    value={selectedTemplate.body}
                    onChange={(e) => setSelectedTemplate({...selectedTemplate, body: e.target.value})}
                    className="input-primary"
                    rows={8}
                    placeholder="Dear {{managerName}},\n\nThis is a reminder that the invoice for {{subscriptionName}} is due on {{dueDate}}.\n\nBest regards,\nIT Team"
                    style={{ resize: 'vertical', minHeight: '120px' }}
                  />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Available Variables</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <code className="bg-gray-200 px-2 py-1 rounded text-xs">{'{{subscriptionName}}'}</code>
                      <span className="text-gray-600">Subscription name</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <code className="bg-gray-200 px-2 py-1 rounded text-xs">{'{{managerName}}'}</code>
                      <span className="text-gray-600">Manager name</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <code className="bg-gray-200 px-2 py-1 rounded text-xs">{'{{dueDate}}'}</code>
                      <span className="text-gray-600">Invoice due date</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <code className="bg-gray-200 px-2 py-1 rounded text-xs">{'{{vendorName}}'}</code>
                      <span className="text-gray-600">Vendor name</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <code className="bg-gray-200 px-2 py-1 rounded text-xs">{'{{cost}}'}</code>
                      <span className="text-gray-600">Total cost</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <code className="bg-gray-200 px-2 py-1 rounded text-xs">{'{{billingCycle}}'}</code>
                      <span className="text-gray-600">Billing cycle</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <ModalFooter>
          <button onClick={() => {
            setShowEmailTemplateModal(false);
            setSelectedTemplate(null);
          }} className="btn-secondary">
            {selectedTemplate ? 'Cancel' : 'Close'}
          </button>
          {selectedTemplate && (
            <button
              onClick={() => {
                alert(`Template ${selectedTemplate.id === 'new' ? 'created' : 'updated'} successfully!`);
                setSelectedTemplate(null);
              }}
              className="btn-primary"
            >
              {selectedTemplate.id === 'new' ? 'Create Template' : 'Save Changes'}
            </button>
          )}
        </ModalFooter>
      </Modal>

      <div className="space-y-6">
        {/* Invoice Compliance Dashboard */}
        {(user?.role === 'admin' || user?.role === 'teamlead') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(() => {
              const totalActive = subscriptions.filter(s => s.status === 'Active').length;
              const reminderEnabled = subscriptions.filter(s => s.reminderSettings?.enabled).length;
              const overdue = subscriptions.filter(s => {
                const status = getReminderStatus(s);
                return status.status === 'overdue';
              }).length;
              const dueSoon = subscriptions.filter(s => {
                const status = getReminderStatus(s);
                return status.status === 'due-soon';
              }).length;

              return (
                <>
                  <div className="card p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Active Subscriptions</p>
                        <p className="text-2xl font-bold text-gray-900">{totalActive}</p>
                      </div>
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <BellIcon className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </div>
                  <div className="card p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Reminders Enabled</p>
                        <p className="text-2xl font-bold text-green-600">{reminderEnabled}</p>
                      </div>
                      <div className="p-3 bg-green-100 rounded-lg">
                        <CheckIcon className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                  </div>
                  <div className="card p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Overdue Invoices</p>
                        <p className="text-2xl font-bold text-red-600">{overdue}</p>
                      </div>
                      <div className="p-3 bg-red-100 rounded-lg">
                        <ClockIcon className="h-6 w-6 text-red-600" />
                      </div>
                    </div>
                  </div>
                  <div className="card p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Due Soon</p>
                        <p className="text-2xl font-bold text-orange-600">{dueSoon}</p>
                      </div>
                      <div className="p-3 bg-orange-100 rounded-lg">
                        <ClockIcon className="h-6 w-6 text-orange-600" />
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg sm:text-heading-2 text-gray-900 dark:text-slate-100">Software Subscriptions</h1>
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
              <TableHead>Invoice Status</TableHead>
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
                  <TableCell>
                    {(() => {
                      const reminderStatus = getReminderStatus(subscription);
                      return (
                        <div className="flex items-center space-x-2">
                          <StatusBadge status={reminderStatus.label} />
                          {subscription.reminderSettings?.nextInvoiceDue && (
                            <span className="text-xs text-gray-500">
                              Due: {new Date(subscription.reminderSettings.nextInvoiceDue).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      );
                    })()}
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