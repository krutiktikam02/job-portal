"use client"

import {
  Users,
  Mail,
  Phone,
  MessageSquare,
  Send,
  X,
  Check,
  ChevronDown,
  ArrowLeft,
  Briefcase,
  Filter,
  Edit2,
  Clock,
} from "lucide-react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const PosterMessage = () => {
  const navigate = useNavigate()
  const [view, setView] = useState('send') // 'send' or 'sent'
  const [jobsWithApplicants, setJobsWithApplicants] = useState([])
  const [sentMessages, setSentMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [selectedApplicant, setSelectedApplicant] = useState(null)
  const [selectedMessage, setSelectedMessage] = useState(null) // For edit
  const [message, setMessage] = useState("")
  const [expandedJobs, setExpandedJobs] = useState({}) // Track expanded job IDs
  const [selectedStatus, setSelectedStatus] = useState('all')

  const toggleJobExpansion = (jobId) => {
    setExpandedJobs((prev) => ({
      ...prev,
      [jobId]: !prev[jobId]
    }))
  }

  const openMessageModal = (applicant = null, messageData = null) => {
    setSelectedApplicant(applicant)
    setSelectedMessage(messageData)
    setMessage(messageData ? messageData.message : "")
    setShowMessageModal(true)
  }

  const closeMessageModal = () => {
    setShowMessageModal(false)
    setSelectedApplicant(null)
    setSelectedMessage(null)
    setMessage("")
  }

  const handleSendOrUpdateMessage = async () => {
    if (!message.trim()) {
      setError("Message cannot be empty")
      return
    }

    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No token found")
      }

      const isEdit = !!selectedMessage
      const url = isEdit ? `${API_BASE_URL}/api/messages/${selectedMessage.id}` : `${API_BASE_URL}/api/messages`
      const method = isEdit ? "PUT" : "POST"

      const body = isEdit 
        ? JSON.stringify({ message: message.trim() })
        : JSON.stringify({
            to_user_id: selectedApplicant.userId,
            message: message.trim(),
          })

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body,
      })

      if (!response.ok) {
        throw new Error(isEdit ? "Failed to update message" : "Failed to send message")
      }

      setSuccessMessage(isEdit ? "Message updated successfully!" : "Message sent successfully!")
      setShowSuccess(true)
      closeMessageModal()
      // Refresh sent messages if in sent view
      if (view === 'sent') {
        fetchSentMessages()
      }
    } catch (err) {
      console.error("Error sending/updating message:", err.message)
      setError(isEdit ? "Failed to update message" : "Failed to send message")
    }
  }

  const fetchSentMessages = async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return

      const response = await fetch(`${API_BASE_URL}/api/messages?type=sent`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSentMessages(data)
      }
    } catch (err) {
      console.error("Error fetching sent messages:", err.message)
    }
  }

  const closeSuccessModal = () => {
    setShowSuccess(false)
    setSuccessMessage(null)
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const token = localStorage.getItem("token")
        if (!token) {
          throw new Error("No token found")
        }

        const jobsResponse = await fetch(`${API_BASE_URL}/api/jobs`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (!jobsResponse.ok) {
          throw new Error("Failed to fetch jobs")
        }

        const jobs = await jobsResponse.json()

        const jobsWithApps = []
        for (const job of jobs) {
          const appsResponse = await fetch(`${API_BASE_URL}/api/applications/${job.id}`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          })

          let applicants = []
          if (appsResponse.ok) {
            const apps = await appsResponse.json()
            applicants = apps.map((app) => ({
              id: app.id,
              userId: app.user_id,
              name: app.applicant_name || "Unknown Applicant",
              email: app.applicant_email || "",
              phone: app.applicant_mobile || "",
              status: app.status || "applied",
              avatar: app.applicant_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "NA",
            }))
          }

          jobsWithApps.push({
            ...job,
            applicants,
          })
        }

        setJobsWithApplicants(jobsWithApps)
        setError(null)
      } catch (err) {
        console.error("Error fetching data:", err.message)
        setError("Failed to load data.")
      } finally {
        setLoading(false)
      }
    }

    if (view === 'send') {
      fetchData()
    } else {
      fetchSentMessages()
    }
  }, [view])

  if (loading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-800 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading {view === 'sent' ? 'messages' : 'applicants'}...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Header Section */}
      <section className="bg-gradient-to-br from-blue-50 to-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/poster-dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-700 mb-2">
                  {view === 'sent' ? 'Sent Messages' : 'Send Messages'}
                </h1>
                <p className="text-lg text-gray-600">
                  {view === 'sent' 
                    ? 'View and manage your previously sent messages' 
                    : 'Communicate with applicants for your job postings'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setView('send')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    view === 'send'
                      ? 'bg-blue-800 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Send New
                </button>
                <button
                  onClick={() => setView('sent')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    view === 'sent'
                      ? 'bg-blue-800 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Sent Messages
                </button>
              </div>
              {view === 'send' && (
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All</option>
                    <option value="applied">Applied</option>
                    <option value="under_review">Under Review</option>
                    <option value="interview">Interview</option>
                    <option value="rejected">Rejected</option>
                    <option value="hired">Hired</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-100 text-red-700 rounded-lg mb-4">
              {error}
            </div>
          )}
        </div>
      </section>

      {/* Content based on view */}
      {view === 'send' ? (
        <section className="py-12 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {jobsWithApplicants.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-700 mb-2">No jobs posted yet</h4>
                <p className="text-gray-600">Post a job to start receiving applications and messages.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {jobsWithApplicants.map((job) => {
                  const filteredApplicants = job.applicants.filter(
                    (applicant) => selectedStatus === 'all' || applicant.status === selectedStatus
                  )
                  const filteredCount = filteredApplicants.length
                  if (filteredCount === 0 && selectedStatus !== 'all') return null // Hide jobs with no matching applicants
                  return (
                    <div key={job.id} className="bg-white rounded-lg border border-gray-200 shadow-sm">
                      <div
                        className="p-6 border-b border-gray-200 cursor-pointer flex justify-between items-center"
                        onClick={() => toggleJobExpansion(job.id)}
                      >
                        <div className="flex items-center space-x-4">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Briefcase className="w-5 h-5 text-blue-800" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-700">{job.job_title}</h3>
                            <p className="text-sm text-gray-600">{filteredCount} applicants</p>
                          </div>
                        </div>
                        <ChevronDown
                          className={`w-5 h-5 text-gray-500 transition-transform ${expandedJobs[job.id] ? 'rotate-180' : ''}`}
                        />
                      </div>
                      {expandedJobs[job.id] && (
                        <div className="p-6">
                          {filteredCount === 0 ? (
                            <p className="text-gray-500 text-center py-8">No applicants matching the selected status.</p>
                          ) : (
                            <div className="space-y-4">
                              {filteredApplicants.map((applicant) => (
                                <div key={applicant.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                  <div className="flex items-center space-x-4 flex-1">
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                      <span className="text-blue-800 font-medium text-sm">{applicant.avatar}</span>
                                    </div>
                                    <div>
                                      <h5 className="font-medium text-gray-700">{applicant.name}</h5>
                                      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                                        <span className="flex items-center space-x-1">
                                          <Mail className="w-3 h-3" />
                                          <span>{applicant.email}</span>
                                        </span>
                                        <span className="flex items-center space-x-1">
                                          <Phone className="w-3 h-3" />
                                          <span>{applicant.phone}</span>
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-3">
                                    <span
                                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        applicant.status === "hired"
                                          ? "bg-green-100 text-green-800"
                                          : applicant.status === "interview"
                                          ? "bg-blue-100 text-blue-800"
                                          : "bg-gray-100 text-gray-800"
                                      }`}
                                    >
                                      {applicant.status}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        openMessageModal(applicant)
                                      }}
                                      className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg font-semibold transition-colors inline-flex items-center space-x-2 text-sm"
                                    >
                                      <MessageSquare className="w-4 h-4" />
                                      <span>Message</span>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="py-12 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {sentMessages.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-700 mb-2">No sent messages yet</h4>
                <p className="text-gray-600">Send your first message to get started.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sentMessages.map((msg) => (
                  <div key={msg.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-800 font-medium text-xs">{msg.sender_name?.charAt(0) || 'U'}</span>
                          </div>
                          <div>
                            <h5 className="font-medium text-gray-700">{msg.sender_name || 'Unknown Recipient'}</h5>
                            <p className="text-sm text-gray-500">{msg.sender_email}</p>
                          </div>
                        </div>
                        <p className="text-gray-600 mb-3 whitespace-pre-wrap">{msg.message}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(msg.updated_at || msg.created_at).toLocaleString()}</span>
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => openMessageModal(null, msg)}
                        className="bg-blue-800 hover:bg-blue-900 text-white px-3 py-1 rounded-lg font-semibold transition-colors inline-flex items-center space-x-1 text-sm ml-4"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit & Resend</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-md" onClick={closeMessageModal} />
          <div className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedMessage ? 'Edit & Resend Message' : 'Send Message'}
              </h2>
              <button
                onClick={closeMessageModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {selectedApplicant && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-700 mb-1">{selectedApplicant.name}</h4>
                  <p className="text-sm text-gray-600">{selectedApplicant.email}</p>
                </div>
              )}
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={selectedMessage ? "Edit your message..." : "Type your message here..."}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-32"
                rows={4}
              />
              <div className="flex space-x-2">
                <button
                  onClick={closeMessageModal}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendOrUpdateMessage}
                  className="flex-1 bg-blue-800 hover:bg-blue-900 text-white py-2 rounded-lg font-semibold transition-colors inline-flex items-center justify-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{selectedMessage ? 'Update & Resend' : 'Send'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-md" onClick={closeSuccessModal} />
          <div className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-6 text-center">
              <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Success!</h2>
              <p className="text-gray-600 mb-6">{successMessage}</p>
              <button
                onClick={closeSuccessModal}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PosterMessage