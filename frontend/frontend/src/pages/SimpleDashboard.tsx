import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import QRScanner from '../components/QRScanner';
import Modal from '../components/ui/Modal';
import ModalFooter from '../components/ui/ModalFooter';
import StatusBadge from '../components/ui/StatusBadge';
import {
  PlusIcon,
  QrCodeIcon,
  DocumentPlusIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const SimpleDashboard: React.FC = () => {
  const { user } = useAuth();
  const [showAddEquipment, setShowAddEquipment] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showCreateRequest, setShowCreateRequest] = useState(false);

  const stats = [
    {
      label: 'Total Equipment',
      value: '24',
      change: '+2 this month',
      icon: <ChartBarIcon className="h-6 w-6" />,
      color: 'primary'
    },
    {
      label: 'Active Subscriptions',
      value: '8',
      change: '+1 this month',
      icon: <CheckCircleIcon className="h-6 w-6" />,
      color: 'success'
    },
    {
      label: 'Pending Requests',
      value: '3',
      change: 'Review needed',
      icon: <ClockIcon className="h-6 w-6" />,
      color: 'warning'
    },
    {
      label: 'Available Items',
      value: '18',
      change: 'Ready for assignment',
      icon: <CheckCircleIcon className="h-6 w-6" />,
      color: 'success'
    }
  ];

  const recentActivity = [
    { action: 'Laptop assigned', item: 'Dell XPS 13', user: 'John Smith', time: '2 hours ago', status: 'Assigned' },
    { action: 'Subscription renewed', item: 'Office 365', user: 'IT Team', time: '1 day ago', status: 'Active' },
    { action: 'Equipment returned', item: 'iPhone 14', user: 'Sarah Wilson', time: '2 days ago', status: 'Available' },
    { action: 'New request', item: 'Monitor', user: 'Mike Johnson', time: '3 days ago', status: 'Pending' }
  ];

  const quickActions = [
    {
      title: 'Add Equipment',
      description: 'Register new equipment to the system',
      icon: <PlusIcon className="h-6 w-6" />,
      onClick: () => setShowAddEquipment(true),
      color: 'primary'
    },
    {
      title: 'Scan QR Code',
      description: 'Quickly find equipment using QR scanner',
      icon: <QrCodeIcon className="h-6 w-6" />,
      onClick: () => setShowQRScanner(true),
      color: 'success'
    },
    {
      title: 'Create Request',
      description: 'Request new equipment or software',
      icon: <DocumentPlusIcon className="h-6 w-6" />,
      onClick: () => setShowCreateRequest(true),
      color: 'warning'
    }
  ];

  return (
    <>
      {/* Add Equipment Modal */}
      <Modal
        isOpen={showAddEquipment}
        onClose={() => setShowAddEquipment(false)}
        title="Add New Equipment"
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>
              Equipment Name
            </label>
            <input type="text" className="input-primary" placeholder="e.g., Dell Laptop" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>
              Serial Number
            </label>
            <input type="text" className="input-primary" placeholder="e.g., DL12345" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>
              Type
            </label>
            <select className="input-primary">
              <option>Laptop</option>
              <option>Desktop</option>
              <option>Monitor</option>
              <option>Phone</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>
              Brand
            </label>
            <input type="text" className="input-primary" placeholder="e.g., Dell" />
          </div>
        </div>

        <ModalFooter>
          <button onClick={() => setShowAddEquipment(false)} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={() => {
              alert('Equipment added successfully!');
              setShowAddEquipment(false);
            }}
            className="btn-primary"
          >
            Add Equipment
          </button>
        </ModalFooter>
      </Modal>

      {/* QR Scanner Modal */}
      <Modal
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        title="QR Code Scanner"
        size="md"
      >
        <div className="text-center">
          <QRScanner
            onScanSuccess={(decodedText) => {
              alert(`QR Code scanned successfully!\nContent: ${decodedText}`);
              setShowQRScanner(false);
              console.log('QR Code content:', decodedText);
            }}
            onScanError={(error) => {
              console.error('QR Scan error:', error);
            }}
            width={400}
            height={300}
            fps={10}
            qrbox={250}
          />
          <p className="text-body-sm mt-4" style={{ color: 'var(--color-gray-600)' }}>
            Position the QR code within the frame to scan
          </p>
        </div>

        <ModalFooter>
          <button onClick={() => setShowQRScanner(false)} className="btn-secondary">
            Close Scanner
          </button>
        </ModalFooter>
      </Modal>

      {/* Create Request Modal */}
      <Modal
        isOpen={showCreateRequest}
        onClose={() => setShowCreateRequest(false)}
        title="Create Equipment Request"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>
              Equipment Type
            </label>
            <select className="input-primary">
              <option>Laptop</option>
              <option>Desktop</option>
              <option>Monitor</option>
              <option>Phone</option>
              <option>Software License</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>
              Justification
            </label>
            <textarea
              className="input-primary"
              rows={3}
              placeholder="Explain why you need this equipment..."
              style={{ resize: 'vertical', minHeight: '80px' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>
              Priority
            </label>
            <select className="input-primary">
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Urgent</option>
            </select>
          </div>
        </div>

        <ModalFooter>
          <button onClick={() => setShowCreateRequest(false)} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={() => {
              alert('Request submitted successfully!');
              setShowCreateRequest(false);
            }}
            className="btn-primary"
          >
            Submit Request
          </button>
        </ModalFooter>
      </Modal>

      {/* Main Dashboard Content */}
      <div className="space-y-8">
        {/* Welcome Section */}
        <div>
          <h1 className="text-xl sm:text-heading-1 mb-2">
            Welcome back, <span className="brand-accent">{user?.name}</span>
          </h1>
          <p className="text-body-lg" style={{ color: 'var(--color-gray-600)' }}>
            Here's an overview of your asset management dashboard
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div key={index} className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div
                  className="p-3 rounded-lg"
                  style={{
                    backgroundColor: `var(--color-${stat.color}-100)`,
                    color: `var(--color-${stat.color}-600)`
                  }}
                >
                  {stat.icon}
                </div>
              </div>
              <div className="text-3xl font-bold mb-1" style={{ color: 'var(--color-gray-900)' }}>
                {stat.value}
              </div>
              <div className="text-body font-medium mb-2" style={{ color: 'var(--color-gray-900)' }}>
                {stat.label}
              </div>
              <div className="text-body-sm" style={{ color: 'var(--color-gray-500)' }}>
                {stat.change}
              </div>
            </div>
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <div className="card p-6">
            <h2 className="text-lg sm:text-heading-3 mb-6">Recent Activity</h2>
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: 'var(--color-gray-50)' }}>
                  <div className="flex-1">
                    <div className="text-body font-medium" style={{ color: 'var(--color-gray-900)' }}>
                      {activity.action}
                    </div>
                    <div className="text-body-sm" style={{ color: 'var(--color-gray-600)' }}>
                      {activity.item} • {activity.user}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <StatusBadge status={activity.status} size="sm" />
                    <span className="text-body-sm" style={{ color: 'var(--color-gray-500)' }}>
                      {activity.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card p-6">
            <h2 className="text-lg sm:text-heading-3 mb-6">Quick Actions</h2>
            <div className="space-y-4">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className="w-full p-4 rounded-lg border-2 border-transparent hover:border-current transition-all text-left"
                  style={{
                    backgroundColor: 'var(--color-gray-50)',
                    color: `var(--color-${action.color}-600)`
                  }}
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className="p-3 rounded-lg"
                      style={{
                        backgroundColor: `var(--color-${action.color}-100)`
                      }}
                    >
                      {action.icon}
                    </div>
                    <div>
                      <div className="font-medium text-body" style={{ color: 'var(--color-gray-900)' }}>
                        {action.title}
                      </div>
                      <div className="text-body-sm" style={{ color: 'var(--color-gray-600)' }}>
                        {action.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SimpleDashboard;