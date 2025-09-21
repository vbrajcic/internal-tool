import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface Request {
  id: string;
  requesterName: string;
  equipmentType: string;
  justification: string;
  status: 'Submitted' | 'TeamLeadReview' | 'AdminReview' | 'Approved' | 'Rejected' | 'Fulfilled';
  teamLeadDecision?: 'Approved' | 'Rejected' | 'Pending';
  adminDecision?: 'Approved' | 'Rejected' | 'Pending';
  teamLeadNotes?: string;
  adminNotes?: string;
  rejectionReason?: string;
  requestedAt: string;
  teamLeadReviewedAt?: string;
  adminReviewedAt?: string;
}

const RequestsPage: React.FC = () => {
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'Approved' | 'Rejected'>('Approved');
  const [reviewNotes, setReviewNotes] = useState('');

  // Mock requests data
  const [requests] = useState<Request[]>([
    {
      id: '1',
      requesterName: 'Employee User',
      equipmentType: 'Laptop',
      justification: 'Current laptop is 5 years old and running slowly. Need new one for development work.',
      status: 'TeamLeadReview',
      teamLeadDecision: 'Pending',
      requestedAt: '2024-01-15T10:30:00Z'
    },
    {
      id: '2',
      requesterName: 'John Smith',
      equipmentType: 'Monitor',
      justification: 'Need dual monitor setup for productivity improvements.',
      status: 'AdminReview',
      teamLeadDecision: 'Approved',
      adminDecision: 'Pending',
      teamLeadNotes: 'Good justification, team member needs this for work.',
      requestedAt: '2024-01-10T14:20:00Z',
      teamLeadReviewedAt: '2024-01-12T09:15:00Z'
    },
    {
      id: '3',
      requesterName: 'Sarah Wilson',
      equipmentType: 'Phone',
      justification: 'Previous phone was stolen, need replacement for work calls.',
      status: 'Approved',
      teamLeadDecision: 'Approved',
      adminDecision: 'Approved',
      teamLeadNotes: 'Emergency replacement needed.',
      adminNotes: 'Approved for immediate ordering.',
      requestedAt: '2024-01-05T11:45:00Z',
      teamLeadReviewedAt: '2024-01-06T08:30:00Z',
      adminReviewedAt: '2024-01-07T16:20:00Z'
    },
    {
      id: '4',
      requesterName: 'Mike Johnson',
      equipmentType: 'Tablet',
      justification: 'Want a tablet for reading.',
      status: 'Rejected',
      teamLeadDecision: 'Rejected',
      rejectionReason: 'Personal use, not business justified.',
      teamLeadNotes: 'This is for personal use, not business necessity.',
      requestedAt: '2024-01-08T13:10:00Z',
      teamLeadReviewedAt: '2024-01-09T10:45:00Z'
    }
  ]);

  // Filter requests based on user role
  const visibleRequests = React.useMemo(() => {
    if (user?.role === 'admin') {
      return requests; // Admin sees all requests
    } else if (user?.role === 'teamlead') {
      return requests.filter(req =>
        req.requesterName === user.name || // Their own requests
        req.status === 'TeamLeadReview' || // Requests needing their review
        req.status === 'AdminReview' || // Requests they approved
        req.teamLeadDecision === 'Approved' || req.teamLeadDecision === 'Rejected' // Requests they reviewed
      );
    } else {
      return requests.filter(req => req.requesterName === user?.name); // Only their own requests
    }
  }, [requests, user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Submitted': return 'bg-blue-100 text-blue-800';
      case 'TeamLeadReview': return 'bg-yellow-100 text-yellow-800';
      case 'AdminReview': return 'bg-orange-100 text-orange-800';
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      case 'Fulfilled': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canReview = (request: Request) => {
    if (user?.role === 'teamlead' && request.status === 'TeamLeadReview') {
      return true;
    }
    if (user?.role === 'admin' && request.status === 'AdminReview') {
      return true;
    }
    return false;
  };

  const handleReview = (request: Request) => {
    setSelectedRequest(request);
    setShowReviewModal(true);
    setReviewDecision('Approved');
    setReviewNotes('');
  };

  const submitReview = () => {
    if (!selectedRequest) return;

    const isTeamLeadReview = user?.role === 'teamlead';
    const reviewType = isTeamLeadReview ? 'Team Lead' : 'Admin';

    alert(`${reviewType} review submitted: ${reviewDecision}\nNotes: ${reviewNotes || 'No notes'}`);
    setShowReviewModal(false);
    setSelectedRequest(null);
  };

  return (
    <>
      {/* Create Request Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-lg w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create Equipment Request</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Type</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Laptop</option>
                  <option>Desktop</option>
                  <option>Monitor</option>
                  <option>Phone</option>
                  <option>Tablet</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Justification</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Explain why you need this equipment for your work..."
                  required
                ></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Specifications (Optional)</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Any specific requirements or preferences..."
                ></textarea>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  alert('Request submitted successfully! Your team lead will review it shortly.');
                  setShowCreateModal(false);
                }}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Submit Request
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Request Modal */}
      {showReviewModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-lg w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {user?.role === 'teamlead' ? 'Team Lead Review' : 'Admin Review'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Requester</label>
                <div className="mt-1 text-sm text-gray-900">{selectedRequest.requesterName}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Equipment Type</label>
                <div className="mt-1 text-sm text-gray-900">{selectedRequest.equipmentType}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Justification</label>
                <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded border">
                  {selectedRequest.justification}
                </div>
              </div>
              {selectedRequest.teamLeadNotes && user?.role === 'admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Team Lead Notes</label>
                  <div className="mt-1 text-sm text-gray-900 bg-blue-50 p-3 rounded border">
                    {selectedRequest.teamLeadNotes}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Decision</label>
                <select
                  value={reviewDecision}
                  onChange={(e) => setReviewDecision(e.target.value as 'Approved' | 'Rejected')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Approved">Approve</option>
                  <option value="Rejected">Reject</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Review Notes {reviewDecision === 'Rejected' && <span className="text-red-500">(Required for rejection)</span>}
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder={reviewDecision === 'Approved' ? 'Optional notes...' : 'Explain why this request is being rejected...'}
                  required={reviewDecision === 'Rejected'}
                ></textarea>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={submitReview}
                disabled={reviewDecision === 'Rejected' && !reviewNotes.trim()}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Review
              </button>
              <button
                onClick={() => setShowReviewModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
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
            <h1 className="text-2xl font-light text-gray-900">Equipment Requests</h1>
            <p className="text-gray-600">Submit and track equipment requests</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            New Request
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-2xl font-light text-gray-900 mb-1">
              {visibleRequests.filter(r => r.status === 'TeamLeadReview').length}
            </div>
            <div className="text-sm font-medium text-gray-900 mb-1">Pending Team Lead</div>
            <div className="text-xs text-gray-500">Awaiting review</div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-2xl font-light text-gray-900 mb-1">
              {visibleRequests.filter(r => r.status === 'AdminReview').length}
            </div>
            <div className="text-sm font-medium text-gray-900 mb-1">Pending Admin</div>
            <div className="text-xs text-gray-500">Final approval needed</div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-2xl font-light text-gray-900 mb-1">
              {visibleRequests.filter(r => r.status === 'Approved').length}
            </div>
            <div className="text-sm font-medium text-gray-900 mb-1">Approved</div>
            <div className="text-xs text-gray-500">Ready for ordering</div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-2xl font-light text-gray-900 mb-1">
              {visibleRequests.filter(r => r.status === 'Rejected').length}
            </div>
            <div className="text-sm font-medium text-gray-900 mb-1">Rejected</div>
            <div className="text-xs text-gray-500">Not approved</div>
          </div>
        </div>

        {/* Requests List */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Lead</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {visibleRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{request.equipmentType}</div>
                        <div className="text-sm text-gray-500">by {request.requesterName}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {request.teamLeadDecision || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {request.adminDecision || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(request.requestedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {canReview(request) && (
                        <button
                          onClick={() => handleReview(request)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Review
                        </button>
                      )}
                      <button className="text-gray-600 hover:text-gray-900">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {visibleRequests.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-xl mb-2">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
            <p className="text-gray-500">Create your first equipment request to get started</p>
          </div>
        )}
      </div>
    </>
  );
};

export default RequestsPage;