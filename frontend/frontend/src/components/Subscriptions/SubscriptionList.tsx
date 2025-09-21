import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import axios from 'axios';

interface Subscription {
  id: string;
  name: string;
  price: number;
  billingFrequency: string;
  paymentMethod: string;
  owner: {
    firstName: string;
    lastName: string;
    email: string;
  };
  renewalDate: string;
  isActive: boolean;
  invoiceCount?: number;
}

const SubscriptionList: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState({
    billingFrequency: '',
    paymentMethod: '',
    isActive: ''
  });

  const { getAccessTokenSilently } = useAuth0();

  const fetchSubscriptions = async () => {
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.get('/api/subscriptions', {
        headers: { Authorization: `Bearer ${token}` },
        params: filter
      });
      setSubscriptions(response.data);
    } catch (err) {
      setError('Failed to fetch subscriptions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [filter]);

  const handleExport = async () => {
    try {
      const token = await getAccessTokenSilently();
      const response = await axios.get('/api/subscriptions/export', {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `subscriptions-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  if (loading) return <div className="p-6 text-center">Loading subscriptions...</div>;
  if (error) return <div className="p-6 text-center text-red-600">{error}</div>;

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Subscription Management</h1>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            Export to Excel
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <select
            value={filter.billingFrequency}
            onChange={(e) => setFilter({...filter, billingFrequency: e.target.value})}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">All Billing Frequencies</option>
            <option value="Monthly">Monthly</option>
            <option value="Yearly">Yearly</option>
          </select>

          <select
            value={filter.paymentMethod}
            onChange={(e) => setFilter({...filter, paymentMethod: e.target.value})}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">All Payment Methods</option>
            <option value="CompanyCard">Company Card</option>
            <option value="PersonalReimbursed">Personal Reimbursed</option>
          </select>

          <select
            value={filter.isActive}
            onChange={(e) => setFilter({...filter, isActive: e.target.value})}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">All Statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {subscriptions.map((subscription) => (
          <div key={subscription.id} className="bg-white rounded-lg shadow-md p-6 border">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold">{subscription.name}</h3>
                <p className="text-2xl font-bold text-green-600">
                  ${subscription.price.toFixed(2)}
                  <span className="text-sm font-normal text-gray-600">
                    /{subscription.billingFrequency.toLowerCase()}
                  </span>
                </p>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  subscription.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {subscription.isActive ? 'Active' : 'Inactive'}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  subscription.paymentMethod === 'CompanyCard' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                }`}>
                  {subscription.paymentMethod === 'CompanyCard' ? 'Company Card' : 'Personal Reimbursed'}
                </span>
              </div>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium">Owner:</p>
              <p className="text-sm">{subscription.owner.firstName} {subscription.owner.lastName}</p>
              <p className="text-xs text-gray-600">{subscription.owner.email}</p>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Next Renewal: <span className="font-medium">
                  {new Date(subscription.renewalDate).toLocaleDateString()}
                </span>
              </p>
              {subscription.invoiceCount !== undefined && (
                <p className="text-sm text-gray-600">
                  Invoices: <span className="font-medium">{subscription.invoiceCount}</span>
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors">
                View Details
              </button>
              <button className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors">
                Upload Invoice
              </button>
              {subscription.isActive && (
                <button className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 transition-colors">
                  Edit
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {subscriptions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No subscriptions found matching your filters.</p>
        </div>
      )}
    </div>
  );
};

export default SubscriptionList;