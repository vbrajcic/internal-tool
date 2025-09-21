import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';

interface ConditionReportProps {
  equipmentId: string;
  currentCondition: string;
  onUpdate?: () => void;
  onClose?: () => void;
}

const ConditionReport: React.FC<ConditionReportProps> = ({
  equipmentId,
  currentCondition,
  onUpdate,
  onClose
}) => {
  const [newCondition, setNewCondition] = useState(currentCondition);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { getAccessTokenSilently } = useAuth0();

  const conditionOptions = [
    { value: 'New', label: 'New', color: 'bg-emerald-100 text-emerald-800' },
    { value: 'Good', label: 'Good', color: 'bg-green-100 text-green-800' },
    { value: 'Fair', label: 'Fair', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'Poor', label: 'Poor', color: 'bg-red-100 text-red-800' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = await getAccessTokenSilently();
      await axios.put(`/api/equipment/${equipmentId}`, {
        condition: newCondition,
        notes: notes.trim() || undefined
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess(true);
      setTimeout(() => {
        if (onUpdate) onUpdate();
        if (onClose) onClose();
      }, 2000);
    } catch (err) {
      setError('Failed to update equipment condition');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-sm w-full">
          <div className="text-center">
            <div className="text-green-600 text-4xl mb-4">✓</div>
            <h2 className="text-lg font-semibold text-green-800 mb-2">
              Condition Updated!
            </h2>
            <p className="text-green-700">
              Equipment condition has been successfully updated.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center p-4 z-50 sm:items-center">
      <div className="bg-white rounded-t-lg sm:rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Update Equipment Condition</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Current Condition:
              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                conditionOptions.find(opt => opt.value === currentCondition)?.color
              }`}>
                {currentCondition}
              </span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              New Condition *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {conditionOptions.map((option) => (
                <label
                  key={option.value}
                  className={`relative flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                    newCondition === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="condition"
                    value={option.value}
                    checked={newCondition === option.value}
                    onChange={(e) => setNewCondition(e.target.value)}
                    className="sr-only"
                  />
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${option.color}`}>
                    {option.label}
                  </span>
                  {newCondition === option.value && (
                    <div className="absolute top-1 right-1">
                      <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Describe any damage, wear, or other observations..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Provide details about the condition change if necessary
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {newCondition === 'Poor' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-yellow-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <p className="text-yellow-800 text-sm font-medium">
                    Equipment marked as "Poor" condition
                  </p>
                  <p className="text-yellow-700 text-xs mt-1">
                    This will flag the equipment for repair or replacement consideration.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading || newCondition === currentCondition}
              className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-center font-medium"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </div>
              ) : (
                'Update Condition'
              )}
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConditionReport;