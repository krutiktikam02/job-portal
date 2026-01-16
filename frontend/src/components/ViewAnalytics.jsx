"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Download, Mail, Save, Briefcase } from "lucide-react"
import { useNavigate } from "react-router-dom"
import AnalyticsReportDisplay from "./AnalyticsReportDisplay"

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const ViewAnalytics = () => {
  const navigate = useNavigate()
  const [view, setView] = useState('oneClick') // 'oneClick', 'customised', or 'autoEmail'
  const [oneClickPeriod, setOneClickPeriod] = useState('yesterday')
  const [customFromDate, setCustomFromDate] = useState('')
  const [customToDate, setCustomToDate] = useState('')
  const [customApplyCount, setCustomApplyCount] = useState('custom') // 'custom' or 'overall'
  const [displayFormat, setDisplayFormat] = useState('browser')
  const [subscriptionStatus, setSubscriptionStatus] = useState('notSubscribed')
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [reportDisplay, setReportDisplay] = useState(null) // For showing report in new tab
  const token = localStorage.getItem('token')

  // Initialize dates
  useEffect(() => {
    const today = new Date()
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(today.getDate() - 30)
    
    setCustomFromDate(thirtyDaysAgo.toISOString().split('T')[0])
    setCustomToDate(today.toISOString().split('T')[0])
  }, [])

  // Fetch subscription settings on mount (real-time)
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/analytics/subscription`, {
          method: 'GET',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        if (response.ok) {
          const data = await response.json()
          if (data.id) {
            setSubscriptionStatus(data.active ? (data.frequency === 'weekly' ? 'weekly' : 'monthly') : 'notSubscribed')
            try {
              const parsedEmails = typeof data.emails === 'string' ? JSON.parse(data.emails) : data.emails
              setEmails(Array.isArray(parsedEmails) ? parsedEmails : [])
            } catch {
              setEmails([])
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch subscription:', err)
      }
    }
    if (token) fetchSubscription()
  }, [token])

  const handleGenerateOneClickReport = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/one-click?period=${oneClickPeriod}`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate report')
      }
      const data = await response.json()
      
      if (displayFormat === 'browser') {
        setReportDisplay(data)
      } else {
        // Download CSV
        downloadCSV(data, 'one-click')
      }
      setLoading(false)
    } catch (err) {
      setError(err.message || 'Failed to generate report')
      setLoading(false)
    }
  }

  const handleGenerateCustomReport = async () => {
    setLoading(true)
    setError(null)
    try {
      let url, reportData
      
      if (customApplyCount === 'overall') {
        // Fetch overall report
        const response = await fetch(`${API_BASE_URL}/api/analytics/overall`, {
          method: 'GET',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        if (!response.ok) throw new Error('Failed to fetch overall report')
        reportData = await response.json()
      } else {
        // Fetch custom date range report
        if (!customFromDate || !customToDate) {
          setError('Please select both from and to dates')
          setLoading(false)
          return
        }
        url = `${API_BASE_URL}/api/analytics/custom?from=${customFromDate}&to=${customToDate}`
        const response = await fetch(url, {
          method: 'GET',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        if (!response.ok) throw new Error('Failed to fetch custom report')
        reportData = await response.json()
      }

      if (displayFormat === 'browser') {
        setReportDisplay(reportData)
      } else {
        // Download CSV
        downloadCSV(reportData, 'custom')
      }
      setLoading(false)
    } catch (err) {
      setError(err.message || 'Failed to generate report')
      setLoading(false)
    }
  }

  const downloadCSV = async (reportData, type) => {
    try {
      let url = `${API_BASE_URL}/api/analytics/export?format=csv`
      
      if (type === 'one-click') {
        const now = new Date()
        const periodMap = {
          'yesterday': { from: new Date(now.setDate(now.getDate() - 1)), to: new Date() },
          'thisWeek': { from: new Date(now.setDate(now.getDate() - now.getDay() + 1)), to: new Date() },
          'thisMonth': { from: new Date(now.getFullYear(), now.getMonth(), 1), to: new Date() }
        }
        const period = periodMap[oneClickPeriod] || periodMap['yesterday']
        const from = period.from.toISOString().split('T')[0]
        const to = period.to.toISOString().split('T')[0]
        url += `&type=custom&from=${from}&to=${to}`
      } else if (reportData.type === 'overall') {
        url += '&type=overall'
      } else {
        url += `&type=custom&from=${customFromDate}&to=${customToDate}`
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Failed to download CSV')
      
      const blob = await response.blob()
      const linkUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = linkUrl
      a.download = `analytics_report_${Date.now()}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(linkUrl)
      document.body.removeChild(a)
    } catch (err) {
      setError('Failed to download CSV: ' + err.message)
    }
  }

  const handleSaveSubscription = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const validEmails = emails.filter(e => e.trim().length > 0)
      if (validEmails.length === 0 && subscriptionStatus !== 'notSubscribed') {
        setError('Please add at least one email for subscription')
        setLoading(false)
        return
      }
      
      const response = await fetch(`${API_BASE_URL}/api/analytics/subscription`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: subscriptionStatus,
          emails: validEmails
        })
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save subscription')
      }
      
      setSuccess('Subscription saved successfully!')
      setLoading(false)
      // Refresh subscription data
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message || 'Failed to save subscription')
      setLoading(false)
    }
  }

  const addEmail = () => {
    setEmails([...emails, ''])
  }

  const updateEmail = (index, value) => {
    const newEmails = [...emails]
    newEmails[index] = value
    setEmails(newEmails)
  }

  const removeEmail = (index) => {
    const newEmails = emails.filter((_, i) => i !== index)
    setEmails(newEmails)
  }

  if (reportDisplay) {
    return (
      <AnalyticsReportDisplay 
        reportData={reportDisplay}
        onBack={() => setReportDisplay(null)}
      />
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Generating report...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/poster-dashboard')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Job Posting Analytics</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8">
          <button
            onClick={() => setView('oneClick')}
            className={`px-4 py-2 font-medium rounded-t-lg ${
              view === 'oneClick'
                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            One Click Report
          </button>
          <button
            onClick={() => setView('customised')}
            className={`px-4 py-2 font-medium rounded-t-lg ${
              view === 'customised'
                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Customised Report
          </button>
          <button
            onClick={() => setView('autoEmail')}
            className={`px-4 py-2 font-medium rounded-t-lg ${
              view === 'autoEmail'
                ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Auto Email Reports
          </button>
        </div>

        {/* One Click Report */}
        {view === 'oneClick' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">One Click Report</h2>
            <div className="space-y-4">
              <div className="flex space-x-6">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="yesterday"
                    checked={oneClickPeriod === 'yesterday'}
                    onChange={(e) => setOneClickPeriod(e.target.value)}
                    className="rounded"
                  />
                  <span>Yesterday</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="thisWeek"
                    checked={oneClickPeriod === 'thisWeek'}
                    onChange={(e) => setOneClickPeriod(e.target.value)}
                    className="rounded"
                  />
                  <span>This Week</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="thisMonth"
                    checked={oneClickPeriod === 'thisMonth'}
                    onChange={(e) => setOneClickPeriod(e.target.value)}
                    className="rounded"
                  />
                  <span>This Month</span>
                </label>
              </div>
              
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="browser"
                    checked={displayFormat === 'browser'}
                    onChange={(e) => setDisplayFormat(e.target.value)}
                    className="rounded"
                  />
                  <span>Display in Browser</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    value="csv"
                    checked={displayFormat === 'csv'}
                    onChange={(e) => setDisplayFormat(e.target.value)}
                    className="rounded"
                  />
                  <span>Download as CSV</span>
                </label>
              </div>

              <p className="text-sm text-gray-500">Get instant insights for your selected period.</p>
              <button
                onClick={handleGenerateOneClickReport}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Generate Report</span>
              </button>
            </div>
          </div>
        )}

        {/* Customised Report */}
        {view === 'customised' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Customised Report</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Apply Count From</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="custom"
                      checked={customApplyCount === 'custom'}
                      onChange={(e) => setCustomApplyCount(e.target.value)}
                      className="rounded"
                    />
                    <span>Custom Date Range</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="overall"
                      checked={customApplyCount === 'overall'}
                      onChange={(e) => setCustomApplyCount(e.target.value)}
                      className="rounded"
                    />
                    <span>Overall (Since Account Creation)</span>
                  </label>
                </div>
              </div>

              {customApplyCount === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                  <div className="flex space-x-4 items-end">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">From</label>
                      <input
                        type="date"
                        value={customFromDate}
                        onChange={(e) => setCustomFromDate(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">To</label>
                      <input
                        type="date"
                        value={customToDate}
                        onChange={(e) => setCustomToDate(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Display Format</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="browser"
                      checked={displayFormat === 'browser'}
                      onChange={(e) => setDisplayFormat(e.target.value)}
                      className="rounded"
                    />
                    <span>Display in Browser</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="csv"
                      checked={displayFormat === 'csv'}
                      onChange={(e) => setDisplayFormat(e.target.value)}
                      className="rounded"
                    />
                    <span>Download as CSV</span>
                  </label>
                </div>
              </div>

              <button
                onClick={handleGenerateCustomReport}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Generate Report</span>
              </button>
            </div>
          </div>
        )}

        {/* Auto Email Reports */}
        {view === 'autoEmail' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Auto Emailing of Job Posting Reports</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="notSubscribed"
                      checked={subscriptionStatus === 'notSubscribed'}
                      onChange={(e) => setSubscriptionStatus(e.target.value)}
                      className="rounded"
                    />
                    <span>Not subscribed</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="weekly"
                      checked={subscriptionStatus === 'weekly'}
                      onChange={(e) => setSubscriptionStatus(e.target.value)}
                      className="rounded"
                    />
                    <span>Weekly (Previous Week Report delivered every Monday)</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="monthly"
                      checked={subscriptionStatus === 'monthly'}
                      onChange={(e) => setSubscriptionStatus(e.target.value)}
                      className="rounded"
                    />
                    <span>Monthly (Previous Month Report delivered 1st of every month)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Email to get reports</label>
                {emails.length === 0 ? (
                  <p className="text-sm text-gray-500 mb-3">No emails added yet</p>
                ) : (
                  <div className="mb-3">
                    {emails.map((email, index) => (
                      <div key={index} className="flex items-center space-x-2 mb-2">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => updateEmail(index, e.target.value)}
                          placeholder="Enter email"
                          className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeEmail(index)}
                          className="text-red-500 hover:text-red-700 font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={addEmail}
                  type="button"
                  className="text-blue-600 hover:text-blue-800 flex items-center space-x-1 text-sm font-medium"
                >
                  <Mail className="w-4 h-4" />
                  <span>Add Email</span>
                </button>
              </div>

              <button
                onClick={handleSaveSubscription}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-2 rounded-lg font-medium flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Error and Success Messages */}
        {error && (
          <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            {success}
          </div>
        )}
      </div>
    </div>
  )
}

export default ViewAnalytics
