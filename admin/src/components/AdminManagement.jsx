import React from 'react';
// REMOVED: import DashboardStats from './DashboardStats'; 
import { 
  createAdmin, 
  canCreateAdmin, 
  getAdminList, 
  toggleCreatePermission, 
  toggleRevokePermission,
  deleteAdmin,
  restoreAdmin
  // REMOVED: getDashboardStats
} from '../utils/api';

export default function AdminManagement() {
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [newAdmin, setNewAdmin] = React.useState({ email: '', password: '', name: '', can_create_admins: false, can_revoke_admins: false });
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [canCreate, setCanCreate] = React.useState(null);
  const [canCreateReason, setCanCreateReason] = React.useState('');
  const [allowGrantCreatePerm, setAllowGrantCreatePerm] = React.useState(false);
  const [allowGrantRevokePerm, setAllowGrantRevokePerm] = React.useState(false);
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [admins, setAdmins] = React.useState([]);
  const [listLoading, setListLoading] = React.useState(true);
  const [currentUser, setCurrentUser] = React.useState(null);
  const [hasPermission, setHasPermission] = React.useState(false);
  const [hasRevokePermission, setHasRevokePermission] = React.useState(false);

  // REMOVED: stats and statsLoading states (we calculate them instantly now)

  // Helper to refetch admin list
  const refetchAdmins = async () => {
    try {
      const list = await getAdminList();
      setAdmins(list.admins || []);
    } catch (err) {
      setError('Failed to refresh admin list');
    }
  };

  // GET CURRENT USER
  React.useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUser(payload);
      } catch (e) {
        console.error("Invalid token:", e);
      }
    }
  }, []);

  // LOAD DATA
  React.useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const perm = await canCreateAdmin();
        if (!mounted) return;
        setCanCreate(!!perm.canCreate);
        setCanCreateReason(perm.reason || '');
        setAllowGrantCreatePerm(perm.reason === 'authorized' || perm.reason === 'no-admins');
        setHasPermission(!!perm.canCreate);
        setAllowGrantRevokePerm(currentUser?.id === 1);
        setHasRevokePermission(!!currentUser?.can_revoke_admins);

        const list = await getAdminList();
        if (mounted) setAdmins(list.admins || []);
      } catch (err) {
        if (mounted) setError('Failed to load admin data');
      } finally {
        if (mounted) setListLoading(false);
      }
    };
    init();
    return () => { mounted = false };
  }, [currentUser]);

  // REMOVED: The generic getDashboardStats useEffect

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newAdmin.email || !newAdmin.password || !newAdmin.name) {
      setError('All fields are required');
      return;
    }
    if (newAdmin.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (canCreateReason === 'authorized') {
      setShowConfirmModal(true);
      return;
    }

    await doCreate();
  };

  const doCreate = async () => {
    setLoading(true);
    try {
      const payload = {
        email: newAdmin.email,
        password: newAdmin.password,
        name: newAdmin.name,
      };
      if (allowGrantCreatePerm) payload.can_create_admins = newAdmin.can_create_admins;
      if (allowGrantRevokePerm) payload.can_revoke_admins = newAdmin.can_revoke_admins;
      if (confirmPassword) payload.creator_password = confirmPassword;

      await createAdmin(payload);
      setSuccess('Admin account created successfully');
      setNewAdmin({ email: '', password: '', name: '', can_create_admins: false, can_revoke_admins: false });
      setShowCreateForm(false);
      setConfirmPassword('');
      await refetchAdmins();
    } catch (err) {
      setError(err.message || 'Failed to create admin');
    } finally {
      setLoading(false);
      setShowConfirmModal(false);
    }
  };

  const toggleCreatePerm = async (id) => {
    if (!hasPermission) return setError('You do not have permission');
    if (Number(id) === Number(currentUser?.id)) return setError('Cannot modify own permissions');
    try {
      await toggleCreatePermission(id);
      setSuccess('Create permission updated');
      await refetchAdmins();
    } catch (e) {
      setError('Failed to update permission');
    }
  };

  const toggleRevokePerm = async (id) => {
    if (!hasRevokePermission) return setError('You do not have permission');
    if (Number(id) === Number(currentUser?.id)) return setError('Cannot modify own permissions');
    try {
      await toggleRevokePermission(id);
      setSuccess('Revoke permission updated');
      await refetchAdmins();
    } catch (e) {
      setError('Failed to update permission');
    }
  };

  const revokeAdmin = async (id) => {
    if (!hasRevokePermission) return setError('You do not have permission');
    if (Number(id) === Number(currentUser?.id)) return setError('Cannot revoke own access');
    if (!window.confirm('Are you sure?')) return;
    try {
      await deleteAdmin(id);
      setSuccess('Admin access revoked');
      await refetchAdmins();
    } catch (e) {
      setError('Failed to revoke admin');
    }
  };

  const restoreAdminAccess = async (id) => {
    if (!hasRevokePermission) return setError('You do not have permission');
    if (!window.confirm('Restore access?')) return;
    try {
      await restoreAdmin(id);
      setSuccess('Admin access restored');
      await refetchAdmins();
    } catch (e) {
      setError('Failed to restore admin');
    }
  };

  const clearMessage = () => {
    setError('');
    setSuccess('');
  };

  React.useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => clearMessage(), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // --- STATS CALCULATION (NEW LOGIC) ---
  // We calculate these directly from the 'admins' list we already have
  const activeAdmins = admins.filter(a => !a.deleted_at).length;
  const revokedAdmins = admins.filter(a => a.deleted_at).length;
  const superUsers = admins.filter(a => a.can_create_admins || a.can_revoke_admins).length;

  if (listLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Management</h1>
          <p className="mt-2 text-gray-600">Manage administrator accounts and access permissions</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* --- NEW SYSTEM STATS ROW (Replaces generic DashboardStats) --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Card 1: Total Admins */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-blue-600">
            <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Administrators</h3>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">{admins.length}</span>
              <span className="text-sm text-gray-500">accounts</span>
            </div>
            <div className="mt-2 text-xs text-blue-600 font-medium">
              {activeAdmins} Active • {revokedAdmins} Revoked
            </div>
          </div>

          {/* Card 2: Security Privileges */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-purple-600">
            <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">High Privilege Users</h3>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">{superUsers}</span>
              <span className="text-sm text-gray-500">users</span>
            </div>
            <div className="mt-2 text-xs text-purple-600 font-medium">
              Have Create/Revoke Access
            </div>
          </div>

          {/* Card 3: System Health */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-green-600">
            <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">System Status</h3>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-green-600">Secure</span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Only Root can grant permissions
            </div>
          </div>
        </div>
        {/* --- END NEW STATS --- */}

        {/* GLOBAL MESSAGES */}
        {(error || success) && (
          <div className="mb-6">
            {error && (
              <div className="relative p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                <span>{error}</span>
                <button onClick={clearMessage} className="absolute top-2 right-2 text-red-600 font-bold">×</button>
              </div>
            )}
            {success && (
              <div className="relative p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
                <span>{success}</span>
                <button onClick={clearMessage} className="absolute top-2 right-2 text-green-600 font-bold">×</button>
              </div>
            )}
          </div>
        )}

        {/* CREATE BUTTON */}
        {canCreate && (
          <div className="mb-10">
            <button
              onClick={() => setShowCreateForm(v => !v)}
              className="inline-flex items-center gap-3 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {showCreateForm ? 'Cancel' : 'Add New Administrator'}
            </button>
          </div>
        )}

        {/* CREATE FORM */}
        {showCreateForm && canCreate && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Create Administrator Account</h2>
            <form onSubmit={handleCreateAdmin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input type="text" value={newAdmin.name} onChange={e => setNewAdmin(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input type="email" value={newAdmin.email} onChange={e => setNewAdmin(p => ({ ...p, email: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input type="password" value={newAdmin.password} onChange={e => setNewAdmin(p => ({ ...p, password: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
              {allowGrantCreatePerm && (
                <div className="flex items-center">
                  <input type="checkbox" id="canCreate" checked={newAdmin.can_create_admins} onChange={e => setNewAdmin(p => ({ ...p, can_create_admins: e.target.checked }))} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                  <label htmlFor="canCreate" className="ml-2 block text-sm text-gray-900">Can create admins</label>
                </div>
              )}
              {allowGrantRevokePerm && (
                <div className="flex items-center">
                  <input type="checkbox" id="canRevoke" checked={newAdmin.can_revoke_admins} onChange={e => setNewAdmin(p => ({ ...p, can_revoke_admins: e.target.checked }))} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                  <label htmlFor="canRevoke" className="ml-2 block text-sm text-gray-900">Can revoke/restore admins</label>
                </div>
              )}
              {canCreateReason === 'authorized' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Creator Password</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Your password to confirm" required />
                </div>
              )}
              <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Creating...' : 'Create Admin'}
              </button>
            </form>
          </div>
        )}

        {/* CONFIRM MODAL */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Creation</h3>
              <p className="text-gray-600 mb-6">Enter your password to confirm creating this admin account.</p>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4" placeholder="Your password" />
              <div className="flex justify-end space-x-3">
                <button onClick={() => setShowConfirmModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
                <button onClick={doCreate} disabled={!confirmPassword || loading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">{loading ? 'Creating...' : 'Confirm'}</button>
              </div>
            </div>
          </div>
        )}

        {/* ADMIN TABLE (UNCHANGED) */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Administrators</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Create Perm</th>
                  <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revoke Perm</th>
                  <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {admins.map(admin => {
                  const adminId = Number(admin.id);
                  const currentId = Number(currentUser?.id);
                  const isRevoked = !!admin.deleted_at;
                  const showRevokeActions = hasRevokePermission && adminId !== 1 && adminId !== currentId;
                  return (
                    <tr key={admin.id} className={`hover:bg-gray-50 transition ${isRevoked ? 'bg-red-50' : ''}`}>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-medium">
                            {admin?.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{admin.name}</div>
                            {adminId === 1 && <span className="inline-block px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">ROOT ADMIN</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-sm text-gray-600">{admin.email}</td>
                      <td className="px-8 py-6 text-sm text-gray-600">
                        <div>{new Date(admin.created_at).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-500">by {admin.created_by_name || 'System'}</div>
                      </td>
                      <td className="px-8 py-6">
                        {adminId === 1 ? <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Full Access</span> :
                          adminId === currentId ? <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${admin.can_create_admins ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{admin.can_create_admins ? 'Can Create Admins' : 'Cannot Create Admins'}</span> :
                            !isRevoked ? <button onClick={() => toggleCreatePerm(admin.id)} className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition ${admin.can_create_admins ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{admin.can_create_admins ? 'Can Create' : 'Cannot Create'}</button> :
                              <span className="text-gray-400 text-xs">Permission N/A (Revoked)</span>}
                      </td>
                      <td className="px-8 py-6">
                        {adminId === 1 ? <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Full Access</span> :
                          adminId === currentId ? <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${admin.can_revoke_admins ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>{admin.can_revoke_admins ? 'Can Revoke' : 'Cannot Revoke'}</span> :
                            !isRevoked ? <button onClick={() => toggleRevokePerm(admin.id)} className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition ${admin.can_revoke_admins ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{admin.can_revoke_admins ? 'Can Revoke' : 'Cannot Revoke'}</button> :
                              <span className="text-gray-400 text-xs">Permission N/A (Revoked)</span>}
                      </td>
                      <td className="px-8 py-6">
                        {isRevoked ? <span className="text-red-600 font-medium">Revoked {new Date(admin.deleted_at).toLocaleDateString()}<div className="text-xs">by {admin.deleted_by_name || '?'}</div></span> : <span className="text-green-600 font-medium">Active</span>}
                      </td>
                      <td className="px-8 py-6">
                        {showRevokeActions && (
                          <>
                            {!isRevoked ?
                              <button onClick={() => revokeAdmin(admin.id)} className="text-red-600 hover:text-red-800 font-medium text-sm mr-2">Revoke Access</button> :
                              <button onClick={() => restoreAdminAccess(admin.id)} className="text-green-600 hover:text-green-800 font-medium text-sm mr-2">Restore Access</button>
                            }
                          </>
                        )}
                        {(!showRevokeActions || adminId === 1 || adminId === currentId) && <span className="text-gray-400 text-sm">No actions available</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {admins.length === 0 && !listLoading && <div className="text-center py-12"><p className="text-gray-500">No administrators found.</p></div>}
        </div>
      </div>
    </div>
  );
}