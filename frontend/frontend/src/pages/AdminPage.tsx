import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import ActionMenu from '../components/ui/ActionMenu';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import ModalFooter from '../components/ui/ModalFooter';
import {
  EyeIcon,
  PencilIcon,
  KeyIcon,
  PowerIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'employee' | 'teamlead' | 'admin';
  department: string;
  status: 'Active' | 'Inactive' | 'Pending';
  lastLogin: string;
  joinDate: string;
}

const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  // const [activeTab] = useState<'users' | 'teams'>('users');

  // Redirect if not admin
  if (user?.role !== 'admin') {
    return (
      <div className="card p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-error-100)' }}>
          <XMarkIcon className="h-8 w-8" style={{ color: 'var(--color-error-600)' }} />
        </div>
        <h3 className="text-heading-3 mb-2" style={{ color: 'var(--color-gray-900)' }}>
          Access Denied
        </h3>
        <p className="text-body" style={{ color: 'var(--color-gray-600)' }}>
          You need administrator privileges to access this page
        </p>
      </div>
    );
  }

  // Mock user data
  const [users] = useState<User[]>([
    {
      id: '1',
      name: 'Admin User',
      email: 'admin@company.com',
      role: 'admin',
      department: 'IT',
      status: 'Active',
      lastLogin: '2024-01-15T10:30:00Z',
      joinDate: '2022-01-15'
    },
    {
      id: '2',
      name: 'Team Lead',
      email: 'teamlead@company.com',
      role: 'teamlead',
      department: 'Engineering',
      status: 'Active',
      lastLogin: '2024-01-14T16:45:00Z',
      joinDate: '2022-03-20'
    },
    {
      id: '3',
      name: 'Employee User',
      email: 'employee@company.com',
      role: 'employee',
      department: 'Marketing',
      status: 'Active',
      lastLogin: '2024-01-14T09:15:00Z',
      joinDate: '2023-05-10'
    },
    {
      id: '4',
      name: 'John Smith',
      email: 'john.smith@company.com',
      role: 'employee',
      department: 'Sales',
      status: 'Active',
      lastLogin: '2024-01-13T14:20:00Z',
      joinDate: '2023-02-15'
    },
    {
      id: '5',
      name: 'Sarah Wilson',
      email: 'sarah.wilson@company.com',
      role: 'teamlead',
      department: 'Design',
      status: 'Active',
      lastLogin: '2024-01-12T11:30:00Z',
      joinDate: '2022-09-01'
    },
    {
      id: '6',
      name: 'Mike Johnson',
      email: 'mike.johnson@company.com',
      role: 'employee',
      department: 'Engineering',
      status: 'Inactive',
      lastLogin: '2023-12-20T08:45:00Z',
      joinDate: '2023-08-15'
    }
  ]);

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterRole === 'All' || u.role === filterRole;
    return matchesSearch && matchesFilter;
  });

  // Action menu items for each user
  const getActionItems = (userData: User) => {
    const actions = [
      {
        id: 'view',
        label: 'View Details',
        icon: <EyeIcon className="h-4 w-4" />,
        onClick: () => handleViewUser(userData)
      },
      {
        id: 'edit',
        label: 'Edit',
        icon: <PencilIcon className="h-4 w-4" />,
        onClick: () => handleEditUser(userData)
      },
      {
        id: 'reset-password',
        label: 'Reset Password',
        icon: <KeyIcon className="h-4 w-4" />,
        onClick: () => handleResetPassword(userData)
      },
      {
        id: 'toggle-status',
        label: userData.status === 'Active' ? 'Deactivate' : 'Activate',
        icon: <PowerIcon className="h-4 w-4" />,
        onClick: () => handleToggleUserStatus(userData)
      }
    ];

    return actions;
  };

  const handleViewUser = (userData: User) => {
    setSelectedUser(userData);
    setShowViewModal(true);
  };

  const formatLastLogin = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const handleEditUser = (userData: User) => {
    setSelectedUser(userData);
    setShowEditModal(true);
  };

  const handleResetPassword = (userData: User) => {
    if (window.confirm(`Are you sure you want to reset password for ${userData.name}? They will receive an email with reset instructions.`)) {
      alert(`Password reset email sent to ${userData.email}`);
    }
  };

  const handleToggleUserStatus = (userData: User) => {
    const action = userData.status === 'Active' ? 'deactivate' : 'activate';
    if (window.confirm(`Are you sure you want to ${action} ${userData.name}?`)) {
      alert(`User ${userData.name} has been ${action}d successfully.`);
      // In a real app, you would update the state or make an API call here
    }
  };

  return (
    <>
      {/* Add User Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New User"
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>
              Full Name
            </label>
            <input type="text" className="input-primary" placeholder="e.g., John Doe" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>
              Email Address
            </label>
            <input type="email" className="input-primary" placeholder="john.doe@company.com" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>
              Role
            </label>
            <select className="input-primary">
              <option value="employee">Employee</option>
              <option value="teamlead">Team Lead</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>
              Department
            </label>
            <select className="input-primary">
              <option>Engineering</option>
              <option>Design</option>
              <option>Marketing</option>
              <option>Sales</option>
              <option>HR</option>
              <option>IT</option>
              <option>Finance</option>
              <option>Operations</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>
              Start Date
            </label>
            <input type="date" className="input-primary" />
          </div>
        </div>

        <ModalFooter>
          <button onClick={() => setShowAddModal(false)} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={() => {
              alert('User added successfully! Invitation email sent.');
              setShowAddModal(false);
            }}
            className="btn-primary"
          >
            Add User
          </button>
        </ModalFooter>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit User"
        size="lg"
      >
        {selectedUser && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>
                Full Name
              </label>
              <input
                type="text"
                defaultValue={selectedUser.name}
                className="input-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>
                Email Address
              </label>
              <input
                type="email"
                defaultValue={selectedUser.email}
                className="input-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>
                Role
              </label>
              <select
                defaultValue={selectedUser.role}
                className="input-primary"
              >
                <option value="employee">Employee</option>
                <option value="teamlead">Team Lead</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>
                Department
              </label>
              <select
                defaultValue={selectedUser.department}
                className="input-primary"
              >
                <option>Engineering</option>
                <option>Design</option>
                <option>Marketing</option>
                <option>Sales</option>
                <option>HR</option>
                <option>IT</option>
                <option>Finance</option>
                <option>Operations</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>
                Status
              </label>
              <select
                defaultValue={selectedUser.status}
                className="input-primary"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-gray-700)' }}>
                Join Date
              </label>
              <input
                type="date"
                defaultValue={selectedUser.joinDate}
                className="input-primary"
              />
            </div>
          </div>
        )}

        <ModalFooter>
          <button onClick={() => setShowEditModal(false)} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={() => {
              if (selectedUser) {
                alert(`User ${selectedUser.name} updated successfully!`);
                setShowEditModal(false);
              }
            }}
            className="btn-primary"
          >
            Save Changes
          </button>
        </ModalFooter>
      </Modal>

      {/* View User Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title="User Details"
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-gray-700)' }}>Full Name</label>
                <div className="text-body" style={{ color: 'var(--color-gray-900)' }}>{selectedUser.name}</div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-gray-700)' }}>Email Address</label>
                <div className="text-body" style={{ color: 'var(--color-gray-900)' }}>{selectedUser.email}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-gray-700)' }}>Role</label>
                <StatusBadge status={selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-gray-700)' }}>Department</label>
                <div className="text-body" style={{ color: 'var(--color-gray-900)' }}>{selectedUser.department}</div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-gray-700)' }}>Status</label>
                <StatusBadge status={selectedUser.status} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-gray-700)' }}>Join Date</label>
                <div className="text-body" style={{ color: 'var(--color-gray-900)' }}>{new Date(selectedUser.joinDate).toLocaleDateString()}</div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-gray-700)' }}>Last Login</label>
                <div className="text-body" style={{ color: 'var(--color-gray-900)' }}>{formatLastLogin(selectedUser.lastLogin)}</div>
              </div>
            </div>
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-gray-50)' }}>
              <h4 className="text-body font-medium mb-2" style={{ color: 'var(--color-gray-900)' }}>Account Information</h4>
              <div className="text-body-sm" style={{ color: 'var(--color-gray-600)' }}>
                User ID: {selectedUser.id}<br />
                Account created: {new Date(selectedUser.joinDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}<br />
                Last activity: {formatLastLogin(selectedUser.lastLogin)}
              </div>
            </div>
          </div>
        )}

        <ModalFooter>
          <button onClick={() => setShowViewModal(false)} className="btn-secondary">
            Close
          </button>
          {selectedUser && (
            <button
              onClick={() => {
                setShowViewModal(false);
                handleEditUser(selectedUser);
              }}
              className="btn-primary"
            >
              Edit User
            </button>
          )}
        </ModalFooter>
      </Modal>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-heading-2 text-gray-900 dark:text-slate-100">User Management</h1>
            <p className="text-body text-gray-600 dark:text-slate-400 mt-1">Manage user accounts, roles, and permissions across the organization</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary inline-flex items-center space-x-2"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Add User</span>
          </button>
        </div>

        {/* Filters and Search */}
        <div className="card p-6">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search users by name, email, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 transition-all duration-150"
              />
            </div>
            <div>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-w-[120px] transition-all duration-150"
              >
                <option>All</option>
                <option value="admin">Admin</option>
                <option value="teamlead">Team Lead</option>
                <option value="employee">Employee</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users List */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Join Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">{u.name}</div>
                    <div className="text-sm text-gray-500 dark:text-slate-400">{u.department}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-900 dark:text-slate-100">{u.email}</span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={u.role.charAt(0).toUpperCase() + u.role.slice(1)} size="sm" />
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-900 dark:text-slate-100">{u.department}</span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={u.status} size="sm" />
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-900 dark:text-slate-100">
                    {formatLastLogin(u.lastLogin)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-gray-900 dark:text-slate-100">
                    {new Date(u.joinDate).toLocaleDateString()}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <ActionMenu
                    actions={getActionItems(u)}
                    align="right"
                    size="sm"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-xl mb-2">👥</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">No users found</h3>
            <p className="text-gray-500 dark:text-slate-400">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminPage;