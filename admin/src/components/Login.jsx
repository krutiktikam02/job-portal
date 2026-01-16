import React from 'react'
import { loginAdmin } from '../utils/api'

export default function Login({ onAuth = () => {} }) {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      const response = await loginAdmin({ email, password })
      
      if (response.token) {
        localStorage.setItem('adminToken', response.token)
        onAuth(response.admin)
      } else {
        throw new Error('Invalid response')
      }
    } catch (err) {
      const msg = err.message?.toLowerCase() || ''
      if (msg.includes('removed') || msg.includes('denied') || msg.includes('403')) {
        setError('Access Denied. Your account has been removed. Please contact the admin.')
      } else {
        setError(err.message || 'Invalid email or password.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">Admin Portal</h1>
          <p className="text-gray-600 mt-2">Sign in to manage your platform</p>
        </div>

        {error && (
          <div className="mb-6 p-5 bg-red-50 border-2 border-red-300 text-red-700 rounded-xl text-center font-semibold animate-pulse">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
            <input 
              type="email"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full px-5 py-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition"
              placeholder="admin@yourapp.com"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition"
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-lg py-5 rounded-xl hover:from-indigo-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign In to Dashboard'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Need help? Contact the <span className="font-bold text-indigo-600">Root Admin</span></p>
        </div>
      </div>
    </div>
  )
}