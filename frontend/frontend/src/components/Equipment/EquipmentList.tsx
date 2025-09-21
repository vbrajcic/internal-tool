import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';

interface Equipment {
  id: string;
  serialNumber: string;
  qrCode: string;
  brand: string;
  model: string;
  type: string;
  status: string;
  condition: string;
  currentOwnerId?: string;
  currentOwner?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

const EquipmentList: React.FC = () => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState({
    type: '',
    status: '',
    condition: ''
  });

  const { getAccessTokenSilently } = useAuth0();

  const fetchEquipment = async () => {
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.get('/api/equipment', {
        headers: { Authorization: `Bearer ${token}` },
        params: filter
      });
      setEquipment(response.data);
    } catch (err) {
      setError('Failed to fetch equipment');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEquipment();
  }, [filter]);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Available': return 'bg-green-100 text-green-800';
      case 'Assigned': return 'bg-blue-100 text-blue-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Broken': return 'bg-red-100 text-red-800';
      case 'Stolen': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConditionBadgeColor = (condition: string) => {
    switch (condition) {
      case 'New': return 'bg-emerald-100 text-emerald-800';
      case 'Good': return 'bg-green-100 text-green-800';
      case 'Fair': return 'bg-yellow-100 text-yellow-800';
      case 'Poor': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <div className="p-6 text-center">Loading equipment...</div>;
  if (error) return <div className="p-6 text-center text-red-600">{error}</div>;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Equipment Management</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <select
            value={filter.type}
            onChange={(e) => setFilter({...filter, type: e.target.value})}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">All Types</option>
            <option value="Laptop">Laptop</option>
            <option value="Display">Display</option>
            <option value="Phone">Phone</option>
            <option value="Tablet">Tablet</option>
            <option value="Dongle">Dongle</option>
            <option value="Keyboard">Keyboard</option>
            <option value="Mouse">Mouse</option>
            <option value="Furniture">Furniture</option>
          </select>

          <select
            value={filter.status}
            onChange={(e) => setFilter({...filter, status: e.target.value})}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Assigned">Assigned</option>
            <option value="Pending">Pending</option>
            <option value="Broken">Broken</option>
            <option value="Stolen">Stolen</option>
          </select>

          <select
            value={filter.condition}
            onChange={(e) => setFilter({...filter, condition: e.target.value})}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">All Conditions</option>
            <option value="New">New</option>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
            <option value="Poor">Poor</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {equipment.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow-md p-6 border">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{item.brand} {item.model}</h3>
                <p className="text-gray-600">{item.type}</p>
                <p className="text-sm text-gray-500">S/N: {item.serialNumber}</p>
              </div>
              <div className="flex flex-col gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(item.status)}`}>
                  {item.status}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConditionBadgeColor(item.condition)}`}>
                  {item.condition}
                </span>
              </div>
            </div>

            {item.currentOwner && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium">Assigned to:</p>
                <p className="text-sm">{item.currentOwner.firstName} {item.currentOwner.lastName}</p>
                <p className="text-xs text-gray-600">{item.currentOwner.email}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors">
                View Details
              </button>
              {item.status === 'Available' && (
                <button className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors">
                  Transfer
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {equipment.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No equipment found matching your filters.</p>
        </div>
      )}
    </div>
  );
};

export default EquipmentList;