"use client"

import {
  ArrowLeft,
  Users,
  Calendar,
  Clock,
  Video,
  MessageSquare,
  Check,
  X,
  Edit3,
  Save,
  Briefcase,
  MapPin,
  Mail,
  Phone,
  Star,
  TrendingUp,
  Link,
  RefreshCw,
} from "lucide-react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

// === ADD THIS IMPORT ===
import EmailScheduler from '../components/EmailScheduler';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const ScheduleInterview = () => {
  const navigate = useNavigate()
  const [scheduledInterviews, setScheduledInterviews] = useState([])
  const [allCandidates, setAllCandidates] = useState([]) // For scheduling new
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [interviewDate, setInterviewDate] = useState("")
  const [interviewTime, setInterviewTime] = useState("")
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedInterviewToCancel, setSelectedInterviewToCancel] = useState(null)

  // === ADD THIS STATE ===
  const [showEmailScheduler, setShowEmailScheduler] = useState(false);
  const [emailCandidate, setEmailCandidate] = useState(null);

  const today = new Date().toISOString().split('T')[0]

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return 'Invalid Date'
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    let time
    if (timeStr.includes('T')) {
      time = new Date(timeStr)
    } else {
      const [hours, minutes] = timeStr.split(':')
      time = new Date(0, 0, 0, parseInt(hours), parseInt(minutes))
    }
    if (isNaN(time.getTime())) return 'Invalid Time'
    return time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }

  const normalizeStatus = (status) => {
    if (!status) return ''
    return status.toLowerCase().replace(/\s+/g, '_')
  }

  const fetchData = async () => {
    try {
      setIsRefreshing(true)
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No token found")
      }

      // Fetch jobs
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

      // Fetch scheduled interviews
      const scheduledResponse = await fetch(`${API_BASE_URL}/api/scheduled-interviews`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!scheduledResponse.ok) {
        throw new Error("Failed to fetch scheduled interviews")
      }

      const scheduledData = await scheduledResponse.json()

      // All candidates for scheduling: status 'applied' or 'under_review'
      let allApps = []
      for (const job of jobs) {
        const appsResponse = await fetch(`${API_BASE_URL}/api/applications/${job.id}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (appsResponse.ok) {
          const apps = await appsResponse.json()
          allApps = allApps.concat(
            apps.map((app) => ({
              ...app,
              job_title: job.job_title,
              job_location: job.job_location,
            }))
          )
        }
      }

      // Create a map of application ID to normalized status
      const appStatusMap = {}
      allApps.forEach((app) => {
        appStatusMap[app.id] = normalizeStatus(app.status)
      })

      // Filter and clean up scheduled interviews: only keep if app status is 'interview'
      const validScheduledData = []
      const deletePromises = []
      for (const si of scheduledData) {
        const appStatus = appStatusMap[si.application_id]
        if (appStatus === 'interview') {
          validScheduledData.push(si)
        } else {
          // Cancel scheduled interview if status changed
          deletePromises.push(
            fetch(`${API_BASE_URL}/api/scheduled-interviews/${si.id}`, {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }).catch((err) => {
              console.error(`Failed to auto-cancel scheduled interview ${si.id}:`, err)
            })
          )
        }
      }

      // Execute deletions in parallel
      if (deletePromises.length > 0) {
        await Promise.all(deletePromises)
        console.log(`Auto-cancelled ${deletePromises.length} outdated scheduled interviews`)
      }

      // Scheduled interviews (now only valid ones)
      const scheduled = validScheduledData.map((si) => ({
        applicationId: si.application_id,
        scheduledInterviewId: si.id,
        name: si.applicant_name || "Unknown Applicant",
        email: si.applicant_email || "",
        phone: si.applicant_mobile || "",
        position: si.job_title || "Unknown Position",
        location: si.job_location || "",
        scheduledDate: si.interview_date || "",
        scheduledTime: si.interview_time || "",
        status: "interview",
        avatar: si.applicant_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "NA",
      }))

      setScheduledInterviews(scheduled)

      const scheduledAppIds = new Set(validScheduledData.map(si => si.application_id));

      const candidates = allApps
        .filter((app) => {
          const normalizedStatus = normalizeStatus(app.status)
          const isScheduled = scheduledAppIds.has(app.id)
          if (["applied", "under_review"].includes(normalizedStatus)) {
            return true
          }
          if (normalizedStatus === "interview" && !isScheduled) {
            return true
          }
          return false
        })
        .map((app) => ({
          id: app.id,
          name: app.applicant_name || "Unknown Applicant",
          email: app.applicant_email || "",
          phone: app.applicant_phone || "",
          position: app.job_title || "Unknown Position",
          status: app.status,
          avatar: app.applicant_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "NA",
        }))

      setAllCandidates(candidates)
      console.log("Candidates loaded:", candidates.map(c => ({id: c.id, position: c.position}))) // Debug log
      setError(null)
    } catch (err) {
      console.error("Error fetching data:", err.message)
      setError("Failed to load data.")
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  const openScheduleModal = () => {
    setIsEditing(false)
    setSelectedCandidate(null)
    setInterviewDate(today)
    setInterviewTime("09:00")
    setShowScheduleModal(true)
  }

  const openEditModal = (interview) => {
    setIsEditing(true)
    setSelectedCandidate(interview)
    setInterviewDate(interview.scheduledDate)
    setInterviewTime(interview.scheduledTime)
    setShowScheduleModal(true)
  }

  const openCancelModal = (interview) => {
    setSelectedInterviewToCancel(interview)
    setShowCancelModal(true)
  }

  const handleCancelInterview = async () => {
    if (!selectedInterviewToCancel) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/scheduled-interviews/${selectedInterviewToCancel.scheduledInterviewId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to cancel interview");
      }

      setSuccessMessage("Interview cancelled successfully!");
      setShowSuccess(true);
      setError(null);
      setShowCancelModal(false);
      setSelectedInterviewToCancel(null);
      // Refresh data
      setTimeout(() => fetchData(), 1000);
    } catch (err) {
      console.error("Error cancelling interview:", err.message);
      setError(err.message);
      setShowCancelModal(false);
    }
  }

  const handleSaveInterview = async () => {
    if (!selectedCandidate || !interviewDate || !interviewTime) {
      setError("Please provide date/time.")
      return
    }

    try {
      const token = localStorage.getItem("token")
      let response

      if (isEditing) {
        // Update existing scheduled interview
        response = await fetch(`${API_BASE_URL}/api/scheduled-interviews/${selectedCandidate.scheduledInterviewId}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            interview_date: interviewDate,
            interview_time: interviewTime,
          }),
        })
      } else {
        // Schedule new interview
        response = await fetch(`${API_BASE_URL}/api/scheduled-interviews`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            application_id: selectedCandidate.id || selectedCandidate.applicationId,
            interview_date: interviewDate,
            interview_time: interviewTime,
          }),
        })
      }

      // Enhanced error handling
      if (!response.ok) {
        const errorText = await response.text()
        console.error("Schedule interview failed:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
          requestBody: {
            application_id: selectedCandidate.id || selectedCandidate.applicationId,
            interview_date: interviewDate,
            interview_time: interviewTime,
          },
        })
        throw new Error(errorText || `Failed to schedule interview (HTTP ${response.status})`)
      }

      const result = await response.json()
      setSuccessMessage(isEditing ? "Interview updated successfully!" : "Interview scheduled successfully!")
      setShowSuccess(true)
      setError(null)
      setShowScheduleModal(false)
      setSelectedCandidate(null)
      setInterviewDate("")
      setInterviewTime("")
      setIsEditing(false)

      // === AUTO-SHOW EMAIL SCHEDULER AFTER SUCCESS ===
      if (!isEditing) {
        setEmailCandidate({
          name: selectedCandidate.name,
          email: selectedCandidate.email,
          position: selectedCandidate.position,
          date: formatDate(interviewDate),
          time: formatTime(interviewTime),
        });
        setShowEmailScheduler(true);
      }

      // Refresh data
      setTimeout(() => fetchData(), 1000)
    } catch (err) {
      console.error("Error saving interview:", err.message)
      setError(err.message)
    }
  }

  const handleCancelSchedule = () => {
    setShowScheduleModal(false)
    setSelectedCandidate(null)
    setInterviewDate("")
    setInterviewTime("")
    setIsEditing(false)
    setError(null)
    setSuccessMessage(null)
  }

  const closeSuccessModal = () => {
    setShowSuccess(false)
    setSuccessMessage(null)
  }

  const closeCancelModal = () => {
    setShowCancelModal(false)
    setSelectedInterviewToCancel(null)
  }

  // === ADD CLOSE FOR EMAIL SCHEDULER ===
  const closeEmailScheduler = () => {
    setShowEmailScheduler(false);
    setEmailCandidate(null);
  };

  // Check for pending applicant from applicants component
  useEffect(() => {
    const pendingStr = localStorage.getItem('pendingInterviewApplicant')
    if (pendingStr) {
      const pendingApplicant = JSON.parse(pendingStr)
      console.log("Pending applicant ID:", pendingApplicant.id) // Debug log
      setSelectedCandidate({
        id: pendingApplicant.id,
        name: pendingApplicant.applicant_name || "Unknown Applicant",
        email: pendingApplicant.applicant_email || "",
        phone: pendingApplicant.applicant_phone || "",
        position: pendingApplicant.job_title || "Unknown Position",
        status: pendingApplicant.status,
        avatar: pendingApplicant.applicant_name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "NA",
      })
      setIsEditing(false)
      setInterviewDate(today)
      setInterviewTime("09:00")
      setShowScheduleModal(true)
      localStorage.removeItem('pendingInterviewApplicant')
    }
  }, [])

  // Fetch scheduled interviews and all candidates on mount
  useEffect(() => {
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-800 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading interviews...</p>
        </div>
      </div>
    )
  }

  const stats = [
    { icon: <Calendar className="w-6 h-6 text-blue-800" />, label: "Scheduled Interviews", value: scheduledInterviews.length.toString() },
    { icon: <Users className="w-6 h-6 text-blue-800" />, label: "Available Candidates", value: allCandidates.length.toString() },
  ]

  return (
    <div className="bg-white min-h-screen">
      {/* Header Section */}
      <section className="bg-gradient-to-br from-blue-50 to-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-start space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors pt-1"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-700 mb-2">Schedule Interviews</h1>
                <p className="text-lg text-gray-600">Manage your interview pipeline and connect with top candidates</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchData}
                className="bg-blue-800 hover:bg-blue-900 text-white p-3 rounded-lg font-semibold transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
              </button>
              <button
                onClick={openScheduleModal}
                className="bg-blue-800 hover:bg-blue-900 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-flex items-center space-x-2"
              >
                <Calendar className="w-5 h-5" />
                <span>Schedule New Interview</span>
              </button>
            </div>
          </div>
          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-lg mb-4">
              {error}
            </div>
          )}

          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="text-center p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer hover:bg-blue-50"
              >
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-blue-50 rounded-lg">{stat.icon}</div>
                </div>
                <h3 className="text-2xl font-bold text-gray-700 mb-1">{stat.value}</h3>
                <p className="text-gray-600 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Scheduled Interviews List */}
      <section className="py-12 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-700 mb-6">Upcoming Interviews</h2>
          {scheduledInterviews.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No interviews scheduled yet. Schedule one to get started!</p>
          ) : (
            <div className="space-y-4">
              {scheduledInterviews.map((interview) => (
                <div key={interview.applicationId} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-800 font-medium text-sm">{interview.avatar}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-700">{interview.name}</h3>
                        <p className="text-sm text-gray-600">{interview.position}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <span className="flex items-center space-x-1">
                            <Mail className="w-4 h-4" />
                            <span>{interview.email}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Phone className="w-4 h-4" />
                            <span>{interview.phone}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <div className="flex items-center space-x-2 justify-end mb-2">
                        <button
                          onClick={() => openEditModal(interview)}
                          className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                          aria-label="Edit interview"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openCancelModal(interview)}
                          className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                          aria-label="Cancel interview"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                        Scheduled
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        {formatDate(interview.scheduledDate)} at {formatTime(interview.scheduledTime)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-md" onClick={handleCancelSchedule} />
          <div
            className="relative bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            style={{ zIndex: 51 }}
          >
            <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">{isEditing ? "Edit Interview" : "Schedule Interview"}</h2>
              <button
                onClick={handleCancelSchedule}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {!isEditing && !selectedCandidate ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Candidate</label>
                  <select
                    value={selectedCandidate?.id || ""}
                    onChange={(e) => {
                      const cand = allCandidates.find((c) => c.id === parseInt(e.target.value))
                      setSelectedCandidate(cand)
                    }}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Choose a candidate</option>
                    {allCandidates.map((cand) => (
                      <option key={cand.id} value={cand.id}>
                        {cand.name} - {cand.position}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-700 mb-1">{selectedCandidate?.name || "No candidate selected"}</h4>
                <p className="text-sm text-gray-600">{selectedCandidate?.position || ""}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Interview Date</label>
                <input
                  type="date"
                  min={today}
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Interview Time</label>
                <input
                  type="time"
                  value={interviewTime}
                  onChange={(e) => setInterviewTime(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleSaveInterview}
                  className="flex-1 bg-blue-800 hover:bg-blue-900 text-white py-2 rounded-lg font-semibold transition-colors inline-flex items-center justify-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{isEditing ? "Update" : "Schedule"}</span>
                </button>
                <button
                  onClick={handleCancelSchedule}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg font-semibold transition-colors inline-flex items-center justify-center space-x-2"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-md" onClick={closeCancelModal} />
          <div className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-6 text-center">
              <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Cancel Interview?</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to cancel the interview with {selectedInterviewToCancel?.name} on {formatDate(selectedInterviewToCancel?.scheduledDate)} at {formatTime(selectedInterviewToCancel?.scheduledTime)}?
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={closeCancelModal}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg font-semibold transition-colors"
                >
                  No, Keep It
                </button>
                <button
                  onClick={handleCancelInterview}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-semibold transition-colors"
                >
                  Yes, Cancel
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

      {/* === ADD EMAIL SCHEDULER MODAL === */}
      {showEmailScheduler && emailCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-md" onClick={closeEmailScheduler} />
          <div className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl p-6" style={{ zIndex: 51 }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Send Interview Reminder</h3>
              <button onClick={closeEmailScheduler} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <EmailScheduler
              to={emailCandidate.email}
              subject={`Interview Scheduled: ${emailCandidate.position}`}
              message={`Dear ${emailCandidate.name},\n\nYour interview for ${emailCandidate.position} is scheduled on ${emailCandidate.date} at ${emailCandidate.time}.\n\nBest regards,\nTalent Corner Team`}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default ScheduleInterview