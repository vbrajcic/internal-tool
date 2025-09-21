import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
  purchaseDate: string;
  classificationTag: string;
  notes?: string;
  currentOwner?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface Transfer {
  id: string;
  fromUser?: { firstName: string; lastName: string };
  toUser?: { firstName: string; lastName: string };
  transferType: string;
  reason: string;
  transferredAt: string;
}

const EquipmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { getAccessTokenSilently } = useAuth0();

  useEffect(() => {
    const fetchEquipmentDetails = async () => {
      try {
        const token = await getAccessTokenSilently();

        const [equipmentRes, transfersRes] = await Promise.all([
          axios.get(`/api/equipment/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`/api/equipment/${id}/transfers`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        setEquipment(equipmentRes.data);
        setTransfers(transfersRes.data);
      } catch (err) {
        setError('Failed to fetch equipment details');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchEquipmentDetails();
    }
  }, [id, getAccessTokenSilently]);

  if (loading) return <div className="p-6 text-center">Loading equipment details...</div>;
  if (error) return <div className="p-6 text-center text-red-600">{error}</div>;
  if (!equipment) return <div className="p-6 text-center">Equipment not found</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{equipment.brand} {equipment.model}</h1>
            <p className="text-gray-600 text-lg">{equipment.type}</p>
          </div>
          <div className="flex flex-col gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              equipment.status === 'Available' ? 'bg-green-100 text-green-800' :
              equipment.status === 'Assigned' ? 'bg-blue-100 text-blue-800' :
              equipment.status === 'Broken' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {equipment.status}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              equipment.condition === 'New' ? 'bg-emerald-100 text-emerald-800' :
              equipment.condition === 'Good' ? 'bg-green-100 text-green-800' :
              equipment.condition === 'Fair' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {equipment.condition}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="font-semibold text-gray-700">Serial Number</label>
              <p className="text-gray-900">{equipment.serialNumber}</p>
            </div>
            <div>
              <label className="font-semibold text-gray-700">QR Code</label>
              <p className="text-gray-900 font-mono">{equipment.qrCode}</p>
            </div>
            <div>
              <label className="font-semibold text-gray-700">Purchase Date</label>
              <p className="text-gray-900">{new Date(equipment.purchaseDate).toLocaleDateString()}</p>
            </div>
            <div>
              <label className="font-semibold text-gray-700">Classification</label>
              <p className="text-gray-900">{equipment.classificationTag}</p>
            </div>
          </div>

          <div className="space-y-4">
            {equipment.currentOwner && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <label className="font-semibold text-gray-700">Current Owner</label>
                <p className="text-gray-900">{equipment.currentOwner.firstName} {equipment.currentOwner.lastName}</p>
                <p className="text-gray-600 text-sm">{equipment.currentOwner.email}</p>
              </div>
            )}

            {equipment.notes && (
              <div>
                <label className="font-semibold text-gray-700">Notes</label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded">{equipment.notes}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
            Edit Equipment
          </button>
          {equipment.status === 'Available' && (
            <button className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
              Transfer Equipment
            </button>
          )}
          <button className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors">
            Update Condition
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Transfer History</h2>

        {transfers.length > 0 ? (
          <div className="space-y-4">
            {transfers.map((transfer) => (
              <div key={transfer.id} className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">
                      {transfer.transferType}: {transfer.fromUser ?
                        `${transfer.fromUser.firstName} ${transfer.fromUser.lastName}` : 'System'
                      } → {transfer.toUser ?
                        `${transfer.toUser.firstName} ${transfer.toUser.lastName}` : 'Available Pool'
                      }
                    </p>
                    <p className="text-gray-600 text-sm">{transfer.reason}</p>
                  </div>
                  <p className="text-gray-500 text-sm">
                    {new Date(transfer.transferredAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No transfer history available</p>
        )}
      </div>
    </div>
  );
};

export default EquipmentDetail;