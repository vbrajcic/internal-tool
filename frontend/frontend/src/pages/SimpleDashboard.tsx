import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import QRScanner from '../components/QRScanner';

const SimpleDashboard: React.FC = () => {
  const { user } = useAuth();
  const [showAddEquipment, setShowAddEquipment] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showCreateRequest, setShowCreateRequest] = useState(false);

  const stats = [
    { label: 'Total Equipment', value: '24', change: '+2 this month' },
    { label: 'Active Subscriptions', value: '8', change: '+1 this month' },
    { label: 'Pending Requests', value: '3', change: 'Review needed' },
    { label: 'Available Items', value: '18', change: 'Ready for assignment' }
  ];

  const recentActivity = [
    { action: 'Laptop assigned', item: 'Dell XPS 13', user: 'John Smith', time: '2 hours ago' },
    { action: 'Subscription renewed', item: 'Office 365', user: 'IT Team', time: '1 day ago' },
    { action: 'Equipment returned', item: 'iPhone 14', user: 'Sarah Wilson', time: '2 days ago' },
    { action: 'New request', item: 'Monitor', user: 'Mike Johnson', time: '3 days ago' }
  ];

  return (
    <>
      {/* Add Equipment Modal */}
      {showAddEquipment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">Add New Equipment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Equipment Name</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100" placeholder="e.g., Dell Laptop" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Serial Number</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100" placeholder="e.g., DL12345" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Type</label>
                <select className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100">
                  <option>Laptop</option>
                  <option>Desktop</option>
                  <option>Monitor</option>
                  <option>Phone</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  alert('Equipment added successfully!');
                  setShowAddEquipment(false);
                }}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Add Equipment
              </button>
              <button
                onClick={() => setShowAddEquipment(false)}
                className="flex-1 bg-gray-300 dark:bg-slate-600 text-gray-700 dark:text-slate-200 py-2 px-4 rounded-md hover:bg-gray-400 dark:hover:bg-slate-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">QR Code Scanner</h3>
              <button
                onClick={() => setShowQRScanner(false)}
                className="text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-300"
              >
                ✕
              </button>
            </div>

            <QRScanner
              onScanSuccess={(decodedText) => {
                // Handle successful QR scan
                alert(`QR Code scanned successfully!\nContent: ${decodedText}`);
                setShowQRScanner(false);

                // Here you could search for equipment by QR code
                // or navigate to the equipment details page
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

            <div className="mt-4 text-center">
              <button
                onClick={() => setShowQRScanner(false)}
                className="bg-gray-300 dark:bg-slate-600 text-gray-700 dark:text-slate-200 py-2 px-4 rounded-md hover:bg-gray-400 dark:hover:bg-slate-500 transition-colors"
              >
                Close Scanner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Request Modal */}
      {showCreateRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">Create Equipment Request</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Equipment Type</label>
                <select className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100">
                  <option>Laptop</option>
                  <option>Desktop</option>
                  <option>Monitor</option>
                  <option>Phone</option>
                  <option>Software License</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Justification</label>
                <textarea className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100" rows={3} placeholder="Explain why you need this equipment..."></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Priority</label>
                <select className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100">
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Urgent</option>
                </select>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  alert('Request submitted successfully!');
                  setShowCreateRequest(false);
                }}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Submit Request
              </button>
              <button
                onClick={() => setShowCreateRequest(false)}
                className="flex-1 bg-gray-300 dark:bg-slate-600 text-gray-700 dark:text-slate-200 py-2 px-4 rounded-md hover:bg-gray-400 dark:hover:bg-slate-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-light text-gray-900 dark:text-white mb-2">
          Welcome back, {user?.name}
        </h1>
        <p className="text-gray-600 dark:text-slate-400">
          Here's an overview of your asset management dashboard
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
            <div className="text-3xl font-light text-gray-900 dark:text-white mb-1">
              {stat.value}
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
              {stat.label}
            </div>
            <div className="text-xs text-gray-500 dark:text-slate-400">
              {stat.change}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h2>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-slate-100">
                    <span className="font-medium">{activity.action}:</span> {activity.item}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    {activity.user} • {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">
            Quick Actions
          </h2>
          <div className="space-y-3">
            <button
              onClick={() => setShowAddEquipment(true)}
              className="w-full text-left p-3 rounded-md border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <div className="font-medium text-gray-900 dark:text-slate-100">Add New Equipment</div>
              <div className="text-sm text-gray-500 dark:text-slate-400">Register a new asset</div>
            </button>
            <button
              onClick={() => setShowQRScanner(true)}
              className="w-full text-left p-3 rounded-md border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <div className="font-medium text-gray-900 dark:text-slate-100">Scan QR Code</div>
              <div className="text-sm text-gray-500 dark:text-slate-400">Quick asset lookup</div>
            </button>
            <button
              onClick={() => setShowCreateRequest(true)}
              className="w-full text-left p-3 rounded-md border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <div className="font-medium text-gray-900 dark:text-slate-100">Create Request</div>
              <div className="text-sm text-gray-500 dark:text-slate-400">Request new equipment</div>
            </button>
            {user?.role === 'admin' && (
              <button
                onClick={() => alert('User management features coming soon!')}
                className="w-full text-left p-3 rounded-md border border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="font-medium text-gray-900 dark:text-slate-100">Manage Users</div>
                <div className="text-sm text-gray-500 dark:text-slate-400">User administration</div>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default SimpleDashboard;