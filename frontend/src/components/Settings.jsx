import { useState, useEffect } from 'react'
import { User, Mail, Phone, Lock, Bell, Save, Eye, EyeOff, Edit } from 'lucide-react'

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

const Settings = () => {
  // Account Settings
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [companyName, setCompanyName] = useState('')

  // Password
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Communication
  const [emailNotifications, setEmailNotifications] = useState(true)

  // UI
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [activeSection, setActiveSection] = useState(null) // 'account' | 'password' | 'communication' | null
  const [originalData, setOriginalData] = useState({})
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [notSignedIn, setNotSignedIn] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  // Helpful token getter: check multiple common keys so component works if token stored under a different name
  const getToken = () =>
    localStorage.getItem('token') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('jwt') ||
    localStorage.getItem('authorization')

  useEffect(() => {
    const fetchSettings = async () => {
      const token = getToken()
      if (!token) {
        // No token found — not signed in. Stop loading and mark as such so UI shows a persistent message
        setIsInitialLoading(false)
        setNotSignedIn(true)
        return
      }
      setIsInitialLoading(true)
      try {
        const res = await fetch(`${API_BASE_URL}/api/settings`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        })
        if (res.ok) {
          const data = await res.json()
          setFullName(data.full_name || '')
          setEmail(data.email || '')
          setMobile(data.mobile || '')
          setCompanyName(data.company_name || '')

          let prefs = { emailNotifications: true }
          if (data.communication_preferences) {
            try {
              prefs = typeof data.communication_preferences === 'string' ? JSON.parse(data.communication_preferences) : data.communication_preferences
            } catch (e) {
              prefs = { emailNotifications: true }
            }
          }
          setEmailNotifications(prefs.emailNotifications !== false)

          setOriginalData({
            full_name: data.full_name || '',
            email: data.email || '',
            mobile: data.mobile || '',
            company_name: data.company_name || '',
            communication_preferences: prefs,
          })
        } else if (res.status === 401) {
          setError('Session expired. Please log in again.')
        }
      } catch (e) {
        console.error(e)
        setError('Failed to load settings')
      } finally {
        setIsInitialLoading(false)
      }
    }

    fetchSettings()
  }, [])

  // Auto-dismiss messages
  useEffect(() => {
    if (!success) return
    const t = setTimeout(() => setSuccess(null), 4000)
    return () => clearTimeout(t)
  }, [success])
  useEffect(() => {
    if (!error) return
    const t = setTimeout(() => setError(null), 4000)
    return () => clearTimeout(t)
  }, [error])

  const hasAccountChanged =
    fullName !== (originalData.full_name || '') ||
    email !== (originalData.email || '') ||
    mobile !== (originalData.mobile || '') ||
    companyName !== (originalData.company_name || '')

  const handleSaveAccountSettings = async () => {
  const token = getToken()
  if (!email) return setError('Email is required')
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) return setError('Please enter a valid email address')

    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/settings/account`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, email, mobile, company_name: companyName }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to update account')
      }
      // Update original data with the returned data
      setOriginalData(prev => ({ ...prev, full_name: fullName, email, mobile, company_name: companyName }))
      setSuccess('✓ Account settings saved successfully!')
      setActiveSection(null)
      setError(null)
    } catch (e) {
      setError(e.message || 'Failed to update account')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangePassword = async () => {
    const token = getToken()
    if (!currentPassword || !newPassword || !confirmPassword) return setError('All password fields are required')
    if (newPassword !== confirmPassword) return setError('New passwords do not match')
    if (newPassword.length < 6) return setError('Password must be at least 6 characters')
    if (currentPassword === newPassword) return setError('New password must be different from current password')

    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/settings/password`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPassword, newPassword: newPassword }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to change password')
      }
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSuccess('✓ Password changed successfully!')
      setActiveSection(null)
      setError(null)
    } catch (e) {
      setError(e.message || 'Failed to change password')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveCommunicationSettings = async () => {
    const token = getToken()
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/settings/communication`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ communication_preferences: { emailNotifications } }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to update communication preferences')
      }
      setOriginalData(prev => ({ ...prev, communication_preferences: { emailNotifications } }))
      setSuccess('✓ Communication settings saved successfully!')
      setActiveSection(null)
    } catch (e) {
      setError(e.message || 'Failed to update communication preferences')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setFullName(originalData.full_name || '')
    setEmail(originalData.email || '')
    setMobile(originalData.mobile || '')
    setCompanyName(originalData.company_name || '')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setEmailNotifications((originalData.communication_preferences || {}).emailNotifications !== false)
    setActiveSection(null)
    setError(null)
    setSuccess(null)
  }

  const tokenAvailable = !!getToken()

  const handleDeleteAccount = async () => {
    const token = getToken()
    if (!deletePassword) {
      setError('Please enter your password to confirm deletion')
      return
    }
    if (deleteConfirmText !== 'DELETE') {
      setError('Please type "DELETE" to confirm account deletion')
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword }),
      })

      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to delete account')
      }

      setSuccess('✓ Account deleted successfully. Redirecting to login...')
      setShowDeleteConfirm(false)
      setDeletePassword('')
      setDeleteConfirmText('')
      
      // Clear token and redirect to login after 2 seconds
      setTimeout(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('authToken')
        localStorage.removeItem('accessToken')
        localStorage.removeItem('jwt')
        window.location.href = '/login'
      }, 2000)
    } catch (e) {
      setError(e.message || 'Failed to delete account')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white min-h-screen pb-12">
      {/* Top messages */}
      {notSignedIn && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-100 border-b border-yellow-400 shadow-lg">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <span className="text-yellow-800 font-semibold">Not signed in — please sign in to load and edit your settings.</span>
            <button onClick={() => setNotSignedIn(false)} className="text-yellow-800 hover:text-yellow-900">✕</button>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-100 border-b border-red-400 shadow-lg">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <span className="text-red-700 font-semibold">{error}</span>
            <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900">✕</button>
          </div>
        </div>
      )}
      {success && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-green-100 border-b border-green-400 shadow-lg">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <span className="text-green-700 font-semibold">{success}</span>
            <button onClick={() => setSuccess(null)} className="text-green-700 hover:text-green-900">✕</button>
          </div>
        </div>
      )}

  <section className="bg-gradient-to-br from-blue-50 to-white py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-700 mb-2 text-center">Account <span className="text-blue-800">Settings</span></h1>
          <p className="text-center text-gray-600">Manage your account preferences and security</p>
        </div>
      </section>

      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 space-y-8">
          {/* If signed in but no profile data returned, show hint */}
          {tokenAvailable && !isInitialLoading && !(originalData && (originalData.full_name || originalData.email || originalData.mobile || originalData.company_name)) && (
            <div className="p-4 rounded border bg-yellow-50 text-yellow-800">No profile information found for your account. You can edit and save your account details below.</div>
          )}
          {/* Account */}
          <div className="bg-white rounded-lg p-6 shadow border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-800 rounded text-white"><User className="w-5 h-5" /></div>
                <h2 className="text-lg font-semibold">Account</h2>
              </div>
              <div>
                {activeSection === 'account' ? (
                  <span className="px-2 py-1 text-xs bg-yellow-200 text-yellow-800 rounded">EDIT MODE</span>
                ) : (
                  <button
                    onClick={() => (tokenAvailable ? setActiveSection('account') : setNotSignedIn(true))}
                    disabled={!tokenAvailable}
                    className={`bg-blue-600 text-white px-3 py-1 rounded inline-flex items-center space-x-2 ${!tokenAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Full name</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)} disabled={activeSection !== 'account'} className={`mt-1 block w-full rounded border px-3 py-2 ${activeSection !== 'account' ? 'opacity-80' : ''}`} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <input value={email} onChange={e => setEmail(e.target.value)} disabled={activeSection !== 'account'} className={`mt-1 block w-full rounded border px-3 py-2 ${activeSection !== 'account' ? 'opacity-80' : ''}`} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Mobile</label>
                <input value={mobile} onChange={e => setMobile(e.target.value)} disabled={activeSection !== 'account'} className={`mt-1 block w-full rounded border px-3 py-2 ${activeSection !== 'account' ? 'opacity-80' : ''}`} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Company</label>
                <input value={companyName} onChange={e => setCompanyName(e.target.value)} disabled={activeSection !== 'account'} className={`mt-1 block w-full rounded border px-3 py-2 ${activeSection !== 'account' ? 'opacity-80' : ''}`} />
              </div>
            </div>

            <div className="mt-4 flex items-center space-x-2">
              {activeSection === 'account' ? (
                <>
                  <button onClick={handleSaveAccountSettings} disabled={isLoading || !hasAccountChanged} className="bg-blue-800 disabled:bg-gray-400 text-white px-4 py-2 rounded">{isLoading ? 'Saving...' : 'Save'}</button>
                  <button onClick={handleCancel} className="px-4 py-2 rounded border">Cancel</button>
                </>
              ) : null}
            </div>
          </div>

          {/* Password */}
          <div className="bg-white rounded-lg p-6 shadow border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-800 rounded text-white"><Lock className="w-5 h-5" /></div>
                <h2 className="text-lg font-semibold">Password</h2>
              </div>
              <div>
                {activeSection === 'password' ? (
                  <span className="px-2 py-1 text-xs bg-yellow-200 text-yellow-800 rounded">EDIT MODE</span>
                ) : (
                  <button
                    onClick={() => (tokenAvailable ? setActiveSection('password') : setNotSignedIn(true))}
                    disabled={!tokenAvailable}
                    className={`bg-blue-600 text-white px-3 py-1 rounded inline-flex items-center space-x-2 ${!tokenAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Current password</label>
                <div className="mt-1 relative">
                  <input type={showCurrentPassword ? 'text' : 'password'} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} disabled={activeSection !== 'password'} className={`block w-full rounded border px-3 py-2 ${activeSection !== 'password' ? 'opacity-80' : ''}`} />
                  <button onClick={() => setShowCurrentPassword(s => !s)} type="button" className="absolute right-2 top-2 text-gray-600">{showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">New password</label>
                <div className="mt-1 relative">
                  <input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} disabled={activeSection !== 'password'} className={`block w-full rounded border px-3 py-2 ${activeSection !== 'password' ? 'opacity-80' : ''}`} />
                  <button onClick={() => setShowNewPassword(s => !s)} type="button" className="absolute right-2 top-2 text-gray-600">{showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Confirm new</label>
                <div className="mt-1 relative">
                  <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={activeSection !== 'password'} className={`block w-full rounded border px-3 py-2 ${activeSection !== 'password' ? 'opacity-80' : ''}`} />
                  <button onClick={() => setShowConfirmPassword(s => !s)} type="button" className="absolute right-2 top-2 text-gray-600">{showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div>
              </div>
            </div>

            {/* Info message when not editing */}
            {activeSection !== 'password' && (
              <p className="mt-3 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                For security, your password is not displayed. Click Edit and enter your current password to change it.
              </p>
            )}

            <div className="mt-4">
              {activeSection === 'password' ? (
                <div className="flex items-center space-x-2">
                  <button onClick={handleChangePassword} disabled={isLoading} className="bg-blue-800 disabled:bg-gray-400 text-white px-4 py-2 rounded">{isLoading ? 'Saving...' : 'Save'}</button>
                  <button onClick={handleCancel} className="px-4 py-2 rounded border">Cancel</button>
                </div>
              ) : null}
            </div>
          </div>

          {/* Communication */}
          <div className="bg-white rounded-lg p-6 shadow border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-800 rounded text-white"><Bell className="w-5 h-5" /></div>
                <h2 className="text-lg font-semibold">Communication</h2>
              </div>
              <div>
                {activeSection === 'communication' ? (
                  <span className="px-2 py-1 text-xs bg-yellow-200 text-yellow-800 rounded">EDIT MODE</span>
                ) : (
                  <button
                    onClick={() => (tokenAvailable ? setActiveSection('communication') : setNotSignedIn(true))}
                    disabled={!tokenAvailable}
                    className={`bg-blue-600 text-white px-3 py-1 rounded inline-flex items-center space-x-2 ${!tokenAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Receive job alerts and updates via email</p>
              </div>
              <div>
                <button onClick={() => activeSection === 'communication' ? setEmailNotifications(v => !v) : null} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${emailNotifications ? 'bg-blue-800' : 'bg-gray-300'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${emailNotifications ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            <div className="mt-4">
              {activeSection === 'communication' ? (
                <div className="flex items-center space-x-2">
                  <button onClick={handleSaveCommunicationSettings} disabled={isLoading} className="bg-blue-800 disabled:bg-gray-400 text-white px-4 py-2 rounded">{isLoading ? 'Saving...' : 'Save'}</button>
                  <button onClick={handleCancel} className="px-4 py-2 rounded border">Cancel</button>
                </div>
              ) : null}
            </div>
          </div>

          {/* Delete Account */}
          <div className="bg-red-50 rounded-lg p-6 shadow border border-red-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-600 rounded text-white">🗑️</div>
                <h2 className="text-lg font-semibold text-red-700">Delete Account</h2>
              </div>
            </div>

            <p className="text-sm text-gray-700 mb-4">
              This action is permanent and cannot be undone. Your account and all associated data will be deleted from our system.
            </p>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={!tokenAvailable}
              className={`bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded inline-flex items-center space-x-2 ${!tokenAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span>Delete Account</span>
            </button>
          </div>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-xl">
                <h3 className="text-lg font-bold text-red-700 mb-4">Confirm Account Deletion</h3>
                
                <p className="text-gray-700 mb-4">
                  This action is permanent and irreversible. Your account and all data will be deleted.
                </p>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Enter your password</label>
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={e => setDeletePassword(e.target.value)}
                      placeholder="Your password"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type "DELETE" to confirm</label>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={e => setDeleteConfirmText(e.target.value.toUpperCase())}
                      placeholder="Type DELETE"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setDeletePassword('')
                      setDeleteConfirmText('')
                    }}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isLoading || !deletePassword || deleteConfirmText !== 'DELETE'}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg"
                  >
                    {isLoading ? 'Deleting...' : 'Delete Account'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </section>
    </div>
  )
}

export default Settings
