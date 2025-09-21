import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRScanner from '../QRScanner';

const QRScanPage: React.FC = () => {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [equipmentData, setEquipmentData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleScanSuccess = async (qrCode: string) => {
    setScanResult(qrCode);
    setLoading(true);
    setError(null);

    try {
      // Simulate API call to get equipment by QR code
      const response = await fetch(`/api/equipment/qr/${qrCode}`);

      if (response.ok) {
        const equipment = await response.json();
        setEquipmentData(equipment);
      } else {
        setError('Equipment not found for this QR code');
      }
    } catch (err) {
      setError('Failed to fetch equipment data');
    } finally {
      setLoading(false);
    }
  };

  const handleScanError = (error: string) => {
    console.error('QR Scan Error:', error);
    // Don't show all scan errors to user as they're frequent
  };

  const resetScan = () => {
    setScanResult(null);
    setEquipmentData(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">QR Code Scanner</h1>
            <button
              onClick={() => navigate('/dashboard')}
              className="text-gray-600 hover:text-gray-800"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {!scanResult && (
            <div>
              <p className="text-gray-600 mb-4 text-center">
                Position the QR code within the camera view to scan equipment details
              </p>
              <QRScanner
                onScanSuccess={handleScanSuccess}
                onScanError={handleScanError}
                width={280}
                height={280}
                qrbox={200}
                fps={5}
              />
            </div>
          )}

          {scanResult && loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading equipment details...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700">{error}</p>
              </div>
              <button
                onClick={resetScan}
                className="mt-3 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {equipmentData && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="font-medium text-green-800">Equipment Found!</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-lg">{equipmentData.brand} {equipmentData.model}</h3>
                  <p className="text-gray-600">{equipmentData.type}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-700">Serial Number</p>
                    <p className="text-gray-900">{equipmentData.serialNumber}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Status</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      equipmentData.status === 'Available' ? 'bg-green-100 text-green-800' :
                      equipmentData.status === 'Assigned' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {equipmentData.status}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Condition</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      equipmentData.condition === 'New' ? 'bg-emerald-100 text-emerald-800' :
                      equipmentData.condition === 'Good' ? 'bg-green-100 text-green-800' :
                      equipmentData.condition === 'Fair' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {equipmentData.condition}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Classification</p>
                    <p className="text-gray-900">{equipmentData.classificationTag}</p>
                  </div>
                </div>

                {equipmentData.currentOwner && (
                  <div className="mt-3 p-3 bg-blue-50 rounded">
                    <p className="font-medium text-gray-700 text-sm">Assigned to:</p>
                    <p className="text-gray-900">{equipmentData.currentOwner.firstName} {equipmentData.currentOwner.lastName}</p>
                    <p className="text-gray-600 text-sm">{equipmentData.currentOwner.email}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/equipment/${equipmentData.id}`)}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  View Details
                </button>
                <button
                  onClick={resetScan}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Scan Another
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-800 mb-2">Tips for Better Scanning</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Ensure good lighting conditions</li>
            <li>• Hold device steady and at proper distance</li>
            <li>• Make sure QR code is clean and undamaged</li>
            <li>• Allow camera access when prompted</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default QRScanPage;