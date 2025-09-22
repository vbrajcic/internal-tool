import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import ActionMenu from '../components/ui/ActionMenu';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import ModalFooter from '../components/ui/ModalFooter';
import {
  EyeIcon,
  CheckIcon,
  PlusIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

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
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'Approved' | 'Rejected'>('Approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

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

  const filteredRequests = visibleRequests.filter(request => {
    const matchesSearch = request.equipmentType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.requesterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.justification.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'All' || request.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Action menu items for each request
  const getActionItems = (request: Request) => {
    const actions = [
      {
        id: 'view',
        label: 'View Details',
        icon: <EyeIcon className="h-4 w-4" />,
        onClick: () => handleViewDetails(request)
      }
    ];

    if (canReview(request)) {
      actions.unshift({
        id: 'review',
        label: user?.role === 'teamlead' ? 'Review' : 'Admin Review',
        icon: user?.role === 'teamlead' ? <UserGroupIcon className="h-4 w-4" /> : <CheckIcon className="h-4 w-4" />,
        onClick: () => handleReview(request)
      });
    }

    return actions;
  };

  const handleViewDetails = (request: Request) => {
    setSelectedRequest(request);
    setShowViewModal(true);
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
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Equipment Request"
        size="lg"
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
              <option>Tablet</option>
              <option>Software License</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>
              Business Justification
            </label>
            <textarea
              className="input-primary"
              rows={4}
              placeholder="Explain why you need this equipment for your work..."
              required
              style={{ resize: 'vertical', minHeight: '100px' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>
              Specifications (Optional)
            </label>
            <textarea
              className="input-primary"
              rows={2}
              placeholder="Any specific requirements or preferences..."
              style={{ resize: 'vertical', minHeight: '60px' }}
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
          <button onClick={() => setShowCreateModal(false)} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={() => {
              alert('Request submitted successfully! Your team lead will review it shortly.');
              setShowCreateModal(false);
            }}
            className="btn-primary"
          >
            Submit Request
          </button>
        </ModalFooter>
      </Modal>

      {/* Review Request Modal */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title={user?.role === 'teamlead' ? 'Team Lead Review' : 'Admin Review'}
        size="lg"
      >
        {selectedRequest && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-gray-700)' }}>Requester</label>
                <div className="text-body" style={{ color: 'var(--color-gray-900)' }}>{selectedRequest.requesterName}</div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-gray-700)' }}>Equipment Type</label>
                <div className="text-body" style={{ color: 'var(--color-gray-900)' }}>{selectedRequest.equipmentType}</div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>Justification</label>
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-gray-50)', color: 'var(--color-gray-900)' }}>
                {selectedRequest.justification}
              </div>
            </div>
            {selectedRequest.teamLeadNotes && user?.role === 'admin' && (
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>Team Lead Notes</label>
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-primary-50)', color: 'var(--color-gray-900)' }}>
                  {selectedRequest.teamLeadNotes}
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>Decision</label>
              <select
                value={reviewDecision}
                onChange={(e) => setReviewDecision(e.target.value as 'Approved' | 'Rejected')}
                className="input-primary"
              >
                <option value="Approved">Approve</option>
                <option value="Rejected">Reject</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>
                Review Notes {reviewDecision === 'Rejected' && <span style={{ color: 'var(--color-error-600)' }}>(Required for rejection)</span>}
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="input-primary"
                rows={3}
                placeholder={reviewDecision === 'Approved' ? 'Optional notes...' : 'Explain why this request is being rejected...'}
                required={reviewDecision === 'Rejected'}
                style={{ resize: 'vertical', minHeight: '80px' }}
              />
            </div>
          </div>
        )}

        <ModalFooter>
          <button onClick={() => setShowReviewModal(false)} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={submitReview}
            disabled={reviewDecision === 'Rejected' && !reviewNotes.trim()}
            className={reviewDecision === 'Approved' ? 'btn-success' : 'btn-secondary'}
            style={reviewDecision === 'Rejected' && !reviewNotes.trim() ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          >
            {reviewDecision === 'Approved' ? 'Approve Request' : 'Reject Request'}
          </button>
        </ModalFooter>
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title="Request Details"
        size="lg"
      >
        {selectedRequest && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-gray-700)' }}>Requester</label>
                <div className="text-body" style={{ color: 'var(--color-gray-900)' }}>{selectedRequest.requesterName}</div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-gray-700)' }}>Equipment Type</label>
                <div className="text-body" style={{ color: 'var(--color-gray-900)' }}>{selectedRequest.equipmentType}</div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-gray-700)' }}>Status</label>
              <StatusBadge status={selectedRequest.status} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>Justification</label>
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-gray-50)', color: 'var(--color-gray-900)' }}>
                {selectedRequest.justification}
              </div>
            </div>
            {selectedRequest.teamLeadNotes && (
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>Team Lead Notes</label>
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-primary-50)', color: 'var(--color-gray-900)' }}>
                  {selectedRequest.teamLeadNotes}
                </div>
              </div>
            )}
            {selectedRequest.adminNotes && (
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>Admin Notes</label>
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-success-50)', color: 'var(--color-gray-900)' }}>
                  {selectedRequest.adminNotes}
                </div>
              </div>
            )}
            {selectedRequest.rejectionReason && (
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>Rejection Reason</label>
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-error-50)', color: 'var(--color-gray-900)' }}>
                  {selectedRequest.rejectionReason}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-gray-700)' }}>Requested</label>
                <div style={{ color: 'var(--color-gray-600)' }}>{new Date(selectedRequest.requestedAt).toLocaleDateString()}</div>
              </div>
              {selectedRequest.teamLeadReviewedAt && (
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-gray-700)' }}>Team Lead Review</label>
                  <div style={{ color: 'var(--color-gray-600)' }}>{new Date(selectedRequest.teamLeadReviewedAt).toLocaleDateString()}</div>
                </div>
              )}
              {selectedRequest.adminReviewedAt && (
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-gray-700)' }}>Admin Review</label>
                  <div style={{ color: 'var(--color-gray-600)' }}>{new Date(selectedRequest.adminReviewedAt).toLocaleDateString()}</div>
                </div>
              )}
            </div>
          </div>
        )}

        <ModalFooter>
          <button onClick={() => setShowViewModal(false)} className="btn-secondary">
            Close
          </button>
        </ModalFooter>
      </Modal>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-heading-2 text-gray-900 dark:text-slate-100">Equipment Requests</h1>
            <p className="text-body text-gray-600 dark:text-slate-400 mt-1">Submit and track equipment requests through the approval workflow</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary inline-flex items-center space-x-2"
          >
            <PlusIcon className="h-4 w-4" />
            <span>New Request</span>
          </button>
        </div>

        {/* Filters and Search */}
        <div className="card p-6">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search requests by equipment type, requester, or justification..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 transition-all duration-150"
              />
            </div>
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-w-[120px] transition-all duration-150"
              >
                <option>All</option>
                <option>Submitted</option>
                <option>TeamLeadReview</option>
                <option>AdminReview</option>
                <option>Approved</option>
                <option>Rejected</option>
                <option>Fulfilled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Requests List */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request</TableHead>
              <TableHead>Requester</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Team Lead</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Requested Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">{request.equipmentType}</div>
                    <div className="text-sm text-gray-500 dark:text-slate-400">
                      {request.justification.length > 40 ? `${request.justification.substring(0, 40)}...` : request.justification}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-900 dark:text-slate-100">{request.requesterName}</span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={request.status} size="sm" />
                </TableCell>
                <TableCell>
                  {request.teamLeadDecision ? (
                    <StatusBadge status={request.teamLeadDecision} size="sm" />
                  ) : (
                    <span className="text-sm text-gray-400 italic">Pending</span>
                  )}
                </TableCell>
                <TableCell>
                  {request.adminDecision ? (
                    <StatusBadge status={request.adminDecision} size="sm" />
                  ) : (
                    <span className="text-sm text-gray-400 italic">Pending</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-900 dark:text-slate-100">
                    {new Date(request.requestedAt).toLocaleDateString()}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <ActionMenu
                    actions={getActionItems(request)}
                    align="right"
                    size="sm"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredRequests.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-xl mb-2">📋</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">No requests found</h3>
            <p className="text-gray-500 dark:text-slate-400">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>
    </>
  );
};

export default RequestsPage;