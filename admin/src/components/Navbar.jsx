import React from 'react'

export default function Navbar({ onNavigate = () => {}, isAuthenticated = false }) {
  return (
    <header className="bg-white shadow">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-indigo-600 rounded flex items-center justify-center text-white font-bold">TCHR</div>
          <div>
            <div className="text-lg font-semibold">Talent Corner JobPortal Admin</div>
            <div className="text-xs text-gray-500">Manage jobs, users & analytics</div>
          </div>
        </div>

        <nav className="space-x-4">
          {isAuthenticated ? (
            <>
              <button onClick={() => onNavigate('dashboard')} className="text-sm text-gray-700 hover:text-indigo-600">Dashboard</button>
              <button onClick={() => onNavigate('send-email')} className="text-sm text-gray-700 hover:text-indigo-600">Send Email</button>
              <button onClick={() => onNavigate('users')} className="text-sm text-gray-700 hover:text-indigo-600">Users</button>
              <button onClick={() => onNavigate('jobs')} className="text-sm text-gray-700 hover:text-indigo-600">Jobs</button>
              <button onClick={() => onNavigate('resumes')} className="text-sm text-gray-700 hover:text-indigo-600">Resumes</button>
              <button onClick={() => onNavigate('admins')} className="text-sm text-gray-700 hover:text-indigo-600">Admins</button>
              <button 
                onClick={() => {
                  localStorage.removeItem('adminToken');
                  onNavigate('login');
                }} 
                className="ml-4 text-sm text-red-600 hover:text-red-700"
              >
                Logout
              </button>
            </>
          ) : (
            <button 
              onClick={() => onNavigate('login')} 
              className="text-sm text-indigo-600 hover:text-indigo-700"
            >
              Login
            </button>
          )}
        </nav>
      </div>
    </header>
  )
}