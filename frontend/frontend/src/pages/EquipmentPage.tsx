import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface Equipment {
  id: string;
  name: string;
  serialNumber: string;
  type: string;
  brand: string;
  model: string;
  status: 'Available' | 'Assigned' | 'Maintenance' | 'Retired';
  assignedTo?: string;
  purchaseDate: string;
  qrCode: string;
  condition: 'New' | 'Good' | 'Fair' | 'Poor';
  notes?: string;
}

const EquipmentPage: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);

  // Available users for transfer
  const availableUsers = [
    { id: '1', name: 'Admin User', email: 'admin@company.com' },
    { id: '2', name: 'Team Lead', email: 'teamlead@company.com' },
    { id: '3', name: 'Employee User', email: 'employee@company.com' },
    { id: '4', name: 'John Smith', email: 'john@company.com' },
    { id: '5', name: 'Sarah Wilson', email: 'sarah@company.com' },
  ];

  // Mock equipment data
  const [equipment] = useState<Equipment[]>([
    {
      id: '1',
      name: 'Dell XPS 13',
      serialNumber: 'DL001',
      type: 'Laptop',
      brand: 'Dell',
      model: 'XPS 13',
      status: 'Assigned',
      assignedTo: 'Employee User',
      purchaseDate: '2023-01-15',
      qrCode: 'QR001',
      condition: 'Good',
      notes: 'Minor scratches on lid'
    },
    {
      id: '2',
      name: 'MacBook Pro 16"',
      serialNumber: 'AP002',
      type: 'Laptop',
      brand: 'Apple',
      model: 'MacBook Pro',
      status: 'Available',
      purchaseDate: '2023-02-20',
      qrCode: 'QR002',
      condition: 'New'
    },
    {
      id: '3',
      name: 'iPhone 14',
      serialNumber: 'AP003',
      type: 'Phone',
      brand: 'Apple',
      model: 'iPhone 14',
      status: 'Assigned',
      assignedTo: 'Team Lead',
      purchaseDate: '2023-03-10',
      qrCode: 'QR003',
      condition: 'Good'
    },
    {
      id: '4',
      name: 'Dell Monitor 27"',
      serialNumber: 'DL004',
      type: 'Monitor',
      brand: 'Dell',
      model: 'UltraSharp',
      status: 'Available',
      purchaseDate: '2023-01-20',
      qrCode: 'QR004',
      condition: 'Good'
    },
    {
      id: '5',
      name: 'ThinkPad X1',
      serialNumber: 'LN005',
      type: 'Laptop',
      brand: 'Lenovo',
      model: 'ThinkPad X1',
      status: 'Maintenance',
      purchaseDate: '2022-11-15',
      qrCode: 'QR005',
      condition: 'Poor',
      notes: 'Screen flickering issue reported'
    },
    {
      id: '6',
      name: 'iPad Pro',
      serialNumber: 'AP006',
      type: 'Tablet',
      brand: 'Apple',
      model: 'iPad Pro',
      status: 'Assigned',
      assignedTo: 'Employee User',
      purchaseDate: '2023-04-15',
      qrCode: 'QR006',
      condition: 'Fair',
      notes: 'Small crack on screen corner'
    }
  ]);

  // Filter equipment based on user role
  const roleFilteredEquipment = React.useMemo(() => {
    if (user?.role === 'admin') {
      return equipment; // Admin sees all equipment
    } else if (user?.role === 'teamlead') {
      return equipment; // TeamLead sees all equipment (for management purposes)
    } else {
      // Employees see only equipment assigned to them
      return equipment.filter(item =>
        item.assignedTo === user?.name && item.status === 'Assigned'
      );
    }
  }, [equipment, user]);

  const filteredEquipment = roleFilteredEquipment.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.brand.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'All' || item.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'bg-green-100 text-green-800';
      case 'Assigned': return 'bg-blue-100 text-blue-800';
      case 'Maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'Retired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'New': return 'bg-green-100 text-green-800';
      case 'Good': return 'bg-blue-100 text-blue-800';
      case 'Fair': return 'bg-yellow-100 text-yellow-800';
      case 'Poor': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleView = (item: Equipment) => {
    setSelectedEquipment(item);
    setShowViewModal(true);
  };

  const handleEdit = (item: Equipment) => {
    setSelectedEquipment(item);
    setShowEditModal(true);
  };

  const handleDelete = (item: Equipment) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"? This action cannot be undone.`)) {
      alert(`Equipment "${item.name}" has been deleted successfully.`);
      // In a real app, you would update the state or make an API call here
    }
  };

  const handleTransfer = (item: Equipment) => {
    setSelectedEquipment(item);
    setShowTransferModal(true);
  };

  const handleConditionReport = (item: Equipment) => {
    setSelectedEquipment(item);
    setShowConditionModal(true);
  };

  return (
    <>
      {/* Add Equipment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg max-w-lg w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">Add New Equipment</h3>
            <div className="grid grid-cols-2 gap-4">
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
                  <option>Tablet</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Brand</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100" placeholder="e.g., Dell" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Model</label>
                <input type="text" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100" placeholder="e.g., XPS 13" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Purchase Date</label>
                <input type="date" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100" />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  alert('Equipment added successfully!');
                  setShowAddModal(false);
                }}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Add Equipment
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-gray-300 dark:bg-slate-600 text-gray-700 dark:text-slate-200 py-2 px-4 rounded-md hover:bg-gray-400 dark:hover:bg-slate-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Equipment Modal */}
      {showViewModal && selectedEquipment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg max-w-lg w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">Equipment Details</h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-300"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Name</label>
                  <div className="mt-1 text-sm text-gray-900 dark:text-slate-100">{selectedEquipment.name}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Serial Number</label>
                  <div className="mt-1 text-sm text-gray-900 dark:text-slate-100">{selectedEquipment.serialNumber}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Type</label>
                  <div className="mt-1 text-sm text-gray-900 dark:text-slate-100">{selectedEquipment.type}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Brand</label>
                  <div className="mt-1 text-sm text-gray-900 dark:text-slate-100">{selectedEquipment.brand}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Model</label>
                  <div className="mt-1 text-sm text-gray-900 dark:text-slate-100">{selectedEquipment.model}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Status</label>
                  <div className="mt-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedEquipment.status)}`}>
                      {selectedEquipment.status}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Purchase Date</label>
                  <div className="mt-1 text-sm text-gray-900 dark:text-slate-100">{new Date(selectedEquipment.purchaseDate).toLocaleDateString()}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">Assigned To</label>
                  <div className="mt-1 text-sm text-gray-900 dark:text-slate-100">{selectedEquipment.assignedTo || 'Not assigned'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">QR Code</label>
                  <div className="mt-1 text-sm text-gray-900 font-mono">{selectedEquipment.qrCode}</div>
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowViewModal(false)}
                className="bg-gray-300 dark:bg-slate-600 text-gray-700 dark:text-slate-200 py-2 px-4 rounded-md hover:bg-gray-400 dark:hover:bg-slate-500 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Equipment Modal */}
      {showEditModal && selectedEquipment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg max-w-lg w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">Edit Equipment</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Equipment Name</label>
                <input type="text" defaultValue={selectedEquipment.name} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Serial Number</label>
                <input type="text" defaultValue={selectedEquipment.serialNumber} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Type</label>
                <select defaultValue={selectedEquipment.type} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Laptop</option>
                  <option>Desktop</option>
                  <option>Monitor</option>
                  <option>Phone</option>
                  <option>Tablet</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Brand</label>
                <input type="text" defaultValue={selectedEquipment.brand} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Model</label>
                <input type="text" defaultValue={selectedEquipment.model} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Status</label>
                <select defaultValue={selectedEquipment.status} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="Available">Available</option>
                  <option value="Assigned">Assigned</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Retired">Retired</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Purchase Date</label>
                <input type="date" defaultValue={selectedEquipment.purchaseDate} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Assigned To</label>
                <input type="text" defaultValue={selectedEquipment.assignedTo || ''} placeholder="Employee name" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  alert(`Equipment "${selectedEquipment.name}" updated successfully!`);
                  setShowEditModal(false);
                }}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 bg-gray-300 dark:bg-slate-600 text-gray-700 dark:text-slate-200 py-2 px-4 rounded-md hover:bg-gray-400 dark:hover:bg-slate-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Equipment Modal */}
      {showTransferModal && selectedEquipment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg max-w-lg w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">Transfer Equipment</h3>
              <button
                onClick={() => setShowTransferModal(false)}
                className="text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-300"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-md">
              <div className="text-sm font-medium text-gray-900 dark:text-slate-100">{selectedEquipment.name}</div>
              <div className="text-sm text-gray-500 dark:text-slate-400">Serial: {selectedEquipment.serialNumber}</div>
              <div className="text-sm text-gray-500 dark:text-slate-400">Currently assigned to: {selectedEquipment.assignedTo || 'Unassigned'}</div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Transfer to User</label>
                <select className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100">
                  <option value="">Select a user...</option>
                  {availableUsers
                    .filter(u => u.name !== selectedEquipment.assignedTo)
                    .map(user => (
                      <option key={user.id} value={user.name}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Transfer Reason</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                  placeholder="Please provide a reason for this transfer..."
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Transfer Process:</strong>
                  <ul className="mt-1 ml-4 list-disc text-xs">
                    <li>Current user will be notified and must confirm the transfer</li>
                    <li>New user will be notified and must accept the equipment</li>
                    <li>Admin approval required for final completion</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  alert('Transfer request initiated! All parties will be notified via email.');
                  setShowTransferModal(false);
                }}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Initiate Transfer
              </button>
              <button
                onClick={() => setShowTransferModal(false)}
                className="flex-1 bg-gray-300 dark:bg-slate-600 text-gray-700 dark:text-slate-200 py-2 px-4 rounded-md hover:bg-gray-400 dark:hover:bg-slate-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Condition Report Modal */}
      {showConditionModal && selectedEquipment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg max-w-lg w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">Report Equipment Condition</h3>
              <button
                onClick={() => setShowConditionModal(false)}
                className="text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-300"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 p-4 bg-gray-50 dark:bg-slate-700 rounded-md">
              <div className="text-sm font-medium text-gray-900 dark:text-slate-100">{selectedEquipment.name}</div>
              <div className="text-sm text-gray-500 dark:text-slate-400">Serial: {selectedEquipment.serialNumber}</div>
              <div className="flex items-center mt-2">
                <span className="text-sm text-gray-500 mr-2">Current Condition:</span>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  selectedEquipment.condition === 'New' ? 'bg-green-100 text-green-800' :
                  selectedEquipment.condition === 'Good' ? 'bg-blue-100 text-blue-800' :
                  selectedEquipment.condition === 'Fair' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {selectedEquipment.condition}
                </span>
              </div>
              {selectedEquipment.notes && (
                <div className="text-sm text-gray-500 mt-2">Notes: {selectedEquipment.notes}</div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Update Condition</label>
                <select className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100">
                  <option value="New">New</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Poor">Poor</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Issue Type</label>
                <select className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100">
                  <option value="">Select issue type...</option>
                  <option value="Hardware">Hardware Issue</option>
                  <option value="Software">Software Issue</option>
                  <option value="Physical">Physical Damage</option>
                  <option value="Performance">Performance Issue</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                  placeholder="Please describe the issue or condition change in detail..."
                />
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md">
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Note:</strong> This report will be sent to IT support and your manager.
                  For urgent issues, please contact IT support directly.
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  alert('Condition report submitted successfully! IT support has been notified.');
                  setShowConditionModal(false);
                }}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Submit Report
              </button>
              <button
                onClick={() => setShowConditionModal(false)}
                className="flex-1 bg-gray-300 dark:bg-slate-600 text-gray-700 dark:text-slate-200 py-2 px-4 rounded-md hover:bg-gray-400 dark:hover:bg-slate-500 transition-colors"
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
            <h1 className="text-2xl font-light text-gray-900 dark:text-slate-100">Equipment Management</h1>
            <p className="text-gray-600 dark:text-slate-400">Manage and track all company equipment</p>
          </div>
          {user?.role === 'admin' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Add Equipment
            </button>
          )}
        </div>

        {/* Filters and Search */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search equipment by name, serial number, or brand..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
              />
            </div>
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>All</option>
                <option>Available</option>
                <option>Assigned</option>
                <option>Maintenance</option>
                <option>Retired</option>
              </select>
            </div>
          </div>
        </div>

        {/* Equipment List */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Equipment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Serial Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Condition</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Assigned To</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                {filteredEquipment.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-slate-100">{item.name}</div>
                        <div className="text-sm text-gray-500 dark:text-slate-400">{item.brand} {item.model}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                      {item.serialNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                      {item.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getConditionColor(item.condition)}`}>
                        {item.condition}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                      {item.assignedTo || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleView(item)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        View
                      </button>
                      {item.assignedTo === user?.name && (
                        <button
                          onClick={() => handleConditionReport(item)}
                          className="text-orange-600 hover:text-orange-900 mr-3"
                        >
                          Report Issue
                        </button>
                      )}
                      {(user?.role === 'admin' || user?.role === 'teamlead') && item.status === 'Assigned' && (
                        <button
                          onClick={() => handleTransfer(item)}
                          className="text-purple-600 hover:text-purple-900 mr-3"
                        >
                          Transfer
                        </button>
                      )}
                      {user?.role === 'admin' && (
                        <>
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-green-600 hover:text-green-900 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </>
                      )}
                      {user?.role === 'teamlead' && (
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredEquipment.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-xl mb-2">📦</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">No equipment found</h3>
            <p className="text-gray-500 dark:text-slate-400">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>
    </>
  );
};

export default EquipmentPage;