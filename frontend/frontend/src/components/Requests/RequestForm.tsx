import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';

const RequestForm: React.FC = () => {
  const [formData, setFormData] = useState({
    equipmentType: '',
    justification: '',
    specifications: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { getAccessTokenSilently } = useAuth0();

  const equipmentTypes = [
    'Laptop', 'Display', 'Phone', 'Tablet',
    'Dongle', 'Keyboard', 'Mouse', 'Furniture'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = await getAccessTokenSilently();
      await axios.post('/api/requests', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess(true);
      setFormData({
        equipmentType: '',
        justification: '',
        specifications: ''
      });
    } catch (err) {
      setError('Failed to submit request. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (success) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <div className="text-green-600 text-4xl mb-4">✓</div>
          <h2 className="text-xl font-semibold text-green-800 mb-2">Request Submitted Successfully!</h2>
          <p className="text-green-700 mb-4">
            Your equipment request has been submitted and is now pending team lead review.
            You will receive an email notification once it has been reviewed.
          </p>
          <button
            onClick={() => setSuccess(false)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Submit Another Request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Request Equipment</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="equipmentType" className="block text-sm font-medium text-gray-700 mb-2">
              Equipment Type *
            </label>
            <select
              id="equipmentType"
              name="equipmentType"
              value={formData.equipmentType}
              onChange={handleInputChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select equipment type</option>
              {equipmentTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="justification" className="block text-sm font-medium text-gray-700 mb-2">
              Justification *
            </label>
            <textarea
              id="justification"
              name="justification"
              value={formData.justification}
              onChange={handleInputChange}
              required
              rows={4}
              placeholder="Please explain why you need this equipment and how it will be used in your work..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">
              Provide a clear business justification for this equipment request.
            </p>
          </div>

          <div>
            <label htmlFor="specifications" className="block text-sm font-medium text-gray-700 mb-2">
              Specifications (Optional)
            </label>
            <textarea
              id="specifications"
              name="specifications"
              value={formData.specifications}
              onChange={handleInputChange}
              rows={3}
              placeholder="Any specific requirements, models, or technical specifications..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">
              Optional: Specify any particular requirements or preferences.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">Approval Process</h3>
            <ol className="text-sm text-blue-700 space-y-1">
              <li>1. Team Lead Review - Your team lead will review and approve/reject the request</li>
              <li>2. Admin Review - If approved by team lead, an admin will make the final decision</li>
              <li>3. Fulfillment - If approved, the equipment will be ordered and assigned to you</li>
            </ol>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading || !formData.equipmentType || !formData.justification}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
            <button
              type="button"
              onClick={() => setFormData({ equipmentType: '', justification: '', specifications: '' })}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear Form
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RequestForm;