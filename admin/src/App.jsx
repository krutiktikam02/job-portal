import React from 'react'
import Navbar from './components/Navbar'
import Dashboard from './components/Dashboard'
import Login from './components/Login'
import AdminManagement from './components/AdminManagement'
import Users from './components/Users'
import Jobs from './components/Jobs'
import Resumes from './components/Resumes'
import SendEmail from './components/SendEmail'

export default function App() {
  const [view, setView] = React.useState('login')
  const [isAuthenticated, setIsAuthenticated] = React.useState(false)

  // Check authentication on component mount
  React.useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (token) {
      setIsAuthenticated(true)
      setView('dashboard')
    }
  }, [])

  const onAuth = () => {
    setIsAuthenticated(true)
    setView('dashboard')
  }

  const handleNavigate = (v) => {
    if (v === 'login' && isAuthenticated) {
      // Handle logout
      setIsAuthenticated(false)
      localStorage.removeItem('adminToken')
    }
    setView(v)
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar onNavigate={handleNavigate} isAuthenticated={isAuthenticated} />
      <main className="p-6">
        {!isAuthenticated ? (
          <Login onAuth={onAuth} />
        ) : (
          <>
            {view === 'dashboard' && <Dashboard />}
            {view === 'send-email' && <SendEmail />}
            {view === 'admins' && <AdminManagement />}
            {view === 'users' && <Users />}
            {view === 'jobs' && <Jobs />}
            {view === 'resumes' && <Resumes />}
          </>
        )}
      </main>
    </div>
  )
}
