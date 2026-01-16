import React, { useState, useEffect } from 'react'
import { getUsers, deleteUser } from '../utils/api'

const formatDateToDDMMYYYY = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function UserTypeFilter({ value, onChange, availableTypes }) {
  return (
    <select 
      value={value} 
      onChange={e => onChange(e.target.value)}
      className="border border-gray-200 rounded px-3 py-1.5 text-sm"
    >
      <option value="">All Users</option>
      {availableTypes.map(type => (
        <option key={type} value={type}>
          {type === 'job_seeker' ? 'Job Seekers' : 'Job Posters'}
        </option>
      ))}
    </select>
  )
}

function DeleteConfirmModal({ user, onConfirm, onCancel, isDeleting }) {
  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete User</h3>
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete <span className="font-semibold">{user.name}</span>? This action cannot be undone.
          </p>
          
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              disabled={isDeleting}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(user.id)}
              disabled={isDeleting}
              className="px-4 py-2 text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userType, setUserType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [allAvailableTypes, setAllAvailableTypes] = useState([]);

  const loadUsers = async (pageNum = 1, filterType = '', searchTerm = '') => {
    try {
      setLoading(true);
      setError(null);
      const response = await getUsers(pageNum, 10, filterType, searchTerm);
      
      setUsers(response.users || []);
      setPagination(response.pagination);
      
      if (response.users && response.users.length > 0) {
        const types = new Set(allAvailableTypes);
        response.users.forEach(user => {
          if (user.user_type) {
            types.add(user.user_type);
          }
        });
        setAllAvailableTypes(Array.from(types).sort());
      }
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(page, userType, searchQuery);
  }, []);

  useEffect(() => {
    if (page > 1) {
      loadUsers(page, userType, searchQuery);
    }
  }, [page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadUsers(1, userType, searchQuery);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setPage(1);
    loadUsers(1, userType, '');
  };

  const handleUserTypeChange = (newType) => {
    setUserType(newType);
    setPage(1);
    loadUsers(1, newType, searchQuery);
  };

  const handleDeleteUser = async (userId) => {
    try {
      setIsDeleting(true);
      await deleteUser(userId);
      
      setUsers(users.filter(u => u.id !== userId));
      setUserToDelete(null);
      
      if (pagination) {
        setPagination({
          ...pagination,
          total: pagination.total - 1
        });
      }
    } catch (err) {
      setError('Failed to delete user: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading && !users.length) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">User Management</h1>
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">User Management</h1>
        <div className="flex gap-4 items-center">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="border border-gray-200 rounded px-3 py-1.5 text-sm flex-1"
            />
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-600"
            >
              Search
            </button>
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="bg-gray-300 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-400"
              >
                Clear
              </button>
            )}
          </form>
          <UserTypeFilter value={userType} onChange={handleUserTypeChange} availableTypes={allAvailableTypes} />
          <button
            onClick={() => loadUsers(page, userType, searchQuery)}
            className="bg-gray-100 p-2 rounded hover:bg-gray-200"
            title="Refresh"
          >
            🔄
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Work Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{user.name}</div>
                  {user.company_name && (
                    <div className="text-sm text-gray-500">{user.company_name}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{user.email}</div>
                  {user.mobile_number && (
                    <div className="text-sm text-gray-500">{user.mobile_number}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                    ${user.user_type === 'job_seeker' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                    {user.user_type === 'job_seeker' ? 'Job Seeker' : 'Job Poster'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                    ${user.work_status ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                    {user.work_status || 'Not specified'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDateToDDMMYYYY(user.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => setUserToDelete(user)}
                    className="text-red-600 hover:text-red-800 font-medium"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-700">
            Showing {((page - 1) * pagination.limit) + 1} to {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} users
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`px-3 py-1 rounded text-sm ${
                page === 1
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= pagination.pages}
              className={`px-3 py-1 rounded text-sm ${
                page >= pagination.pages
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}

      <DeleteConfirmModal 
        user={userToDelete}
        onConfirm={handleDeleteUser}
        onCancel={() => setUserToDelete(null)}
        isDeleting={isDeleting}
      />
    </div>
  );
}
