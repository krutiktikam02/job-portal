"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Users,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Download,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileText,
  X,
  CheckCircle,
} from "lucide-react"

const STATUS_OPTIONS = [
  { value: "applied", label: "Applied" },
  { value: "under_review", label: "Under Review" },
  { value: "interview", label: "Interview" },
  { value: "rejected", label: "Rejected" },
  { value: "hired", label: "Hired" },
]

const statusBadgeClasses = (status) => {
  switch (status) {
    case "applied":
      return "bg-blue-50 text-blue-700 border-blue-200"
    case "under_review":
      return "bg-yellow-50 text-yellow-700 border-yellow-200"
    case "interview":
      return "bg-blue-50 text-blue-700 border-blue-200"
    case "hired":
      return "bg-green-50 text-green-700 border-green-200"
    case "rejected":
      return "bg-red-50 text-red-700 border-red-200"
    default:
      return "bg-gray-50 text-gray-700 border-gray-200"
  }
}

const statusLabel = (status) => {
  const found = STATUS_OPTIONS.find((s) => s.value === status)
  return found ? found.label : "Under Review"
}

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const Applicants = () => {
  const navigate = useNavigate()
  const [jobsWithApplicants, setJobsWithApplicants] = useState([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [expandedJob, setExpandedJob] = useState(null)
  const [selectedApplicant, setSelectedApplicant] = useState(null)
  const [cvLoadErrors, setCvLoadErrors] = useState({}) // Track CV load errors per applicant

  // New: status update state (modal)
  const [statusUpdateValue, setStatusUpdateValue] = useState("under_review")
  const [statusSaving, setStatusSaving] = useState(false)
  const [statusError, setStatusError] = useState("")
  const [showStatusSuccess, setShowStatusSuccess] = useState(false)

  const fetchApplicants = async () => {
    try {
      setIsRefreshing(true)
      const token = localStorage.getItem("token")
      // Fetch user's jobs
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

      // Fetch applications for each job
      const applicationsPromises = jobs.map((job) =>
        fetch(`${API_BASE_URL}/api/applications/${job.id}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
          .then((res) => {
            if (!res.ok) {
              throw new Error(`Failed to fetch applications for job ${job.id}`)
            }
            return res.json()
          })
          .catch(() => []),
      )

      const applicationsResults = await Promise.all(applicationsPromises)
      const jobsWithApps = jobs.map((job, index) => ({
        ...job,
        applicants: (applicationsResults[index] || []).map((a) => ({
          ...a,
          status: a.status || "under_review",
        })),
      }))

      setJobsWithApplicants(jobsWithApps)
      setError(null)
      setSuccessMessage("Applicants updated successfully.")
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      console.error("Error fetching applicants:", err.message)
      setError("Failed to load applicants data.")
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchApplicants()
  }, [])

  const toggleJobExpansion = (jobId) => {
    setExpandedJob(expandedJob === jobId ? null : jobId)
  }

  const openApplicantDetails = (applicant) => {
    setSelectedApplicant(applicant)
    setStatusUpdateValue(applicant.status || "under_review")
    setStatusError("")
  }

  const closeApplicantDetails = () => {
    setSelectedApplicant(null)
    setStatusUpdateValue("under_review")
    setStatusError("")
  }

  const handleCvLoadError = (applicantKey) => {
    setCvLoadErrors((prev) => ({ ...prev, [applicantKey]: true }))
  }

  const getApplicantKey = (applicant) => applicant.applicant_email // Unique key for state

  const getResumeFileExtension = (url) => {
    if (!url) return '.pdf';
    if (url.includes('.docx')) return '.docx';
    if (url.includes('.doc')) return '.doc';
    return '.pdf';
  };

  const handleDownloadCV = async (cvUrl, fileName) => {
    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("jwt") ||
        ""

      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {}

      // If cvUrl points directly to GCS, use the backend proxy that adds auth
      let downloadUrl = cvUrl
      if (cvUrl && cvUrl.includes("storage.googleapis.com")) {
        downloadUrl = `${API_BASE_URL}/download?url=${encodeURIComponent(cvUrl)}`
      } else if (cvUrl && cvUrl.startsWith("/")) {
        // server relative path
        downloadUrl = `${API_BASE_URL}${cvUrl}`
      }

      const response = await fetch(downloadUrl, {
        headers: authHeaders,
      })

      if (!response.ok) {
        throw new Error("Failed to fetch CV")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const ext = getResumeFileExtension(cvUrl)
      a.download = fileName ? `${fileName}${ext}` : `Resume${ext}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Download failed:", error)
    }
  }

  // New: update status API call
  const saveApplicantStatus = async () => {
    if (!selectedApplicant?.id) return

    setStatusSaving(true)
    setStatusError("")
    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("jwt") ||
        ""

      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {}

      let succeeded = false
      let lastResponse = null

      // For all statuses, use status update attempts (no special handling for interview)
      const attempts = [
        { url: `${API_BASE_URL}/api/applications/${selectedApplicant.id}/status`, method: "PATCH", type: "json" },
        { url: `${API_BASE_URL}/api/applications/${selectedApplicant.id}/status`, method: "PUT", type: "json" },
        { url: `${API_BASE_URL}/api/applications/${selectedApplicant.id}`, method: "PATCH", type: "json" },
        { url: `${API_BASE_URL}/api/applications/${selectedApplicant.id}`, method: "PUT", type: "form" },
      ]

      for (const attempt of attempts) {
        try {
          let res
          if (attempt.type === "json") {
            res = await fetch(attempt.url, {
              method: attempt.method,
              headers: { ...authHeaders, "Content-Type": "application/json" },
              body: JSON.stringify({ status: statusUpdateValue }),
            })
          } else {
            const fd = new FormData()
            fd.append("applicant_name", (selectedApplicant.applicant_name || "").trim())
            fd.append("applicant_email", (selectedApplicant.applicant_email || "").trim())
            fd.append("applicant_mobile", (selectedApplicant.applicant_mobile || "").trim())
            fd.append("city", (selectedApplicant.city || "").trim())
            fd.append("state", (selectedApplicant.state || "").trim())
            fd.append("experience", selectedApplicant.experience || "")
            fd.append("status", statusUpdateValue)
            res = await fetch(attempt.url, {
              method: attempt.method,
              headers: authHeaders,
              body: fd,
            })
          }

          lastResponse = res

          if (res.ok) {
            succeeded = true
            break
          }

          // If explicitly unauthorized, stop and show server message
          if (res.status === 401 || res.status === 403) {
            const txt = await res.text().catch(() => "")
            throw new Error(txt || "Unauthorized")
          }

          // Otherwise, try the next endpoint/method
        } catch (err) {
          lastResponse = err
          continue
        }
      }

      if (!succeeded) {
        let serverMsg = ""
        if (lastResponse && typeof lastResponse.text === "function") {
          try {
            serverMsg = await lastResponse.text()
          } catch {
            // ignore
          }
        }
        console.error("[v0] Status update error:", serverMsg || lastResponse)
        setStatusError(serverMsg || "Failed to update status. Please try again.")
        return
      }

      // Update local state without refetching
      setJobsWithApplicants((prev) =>
        prev.map((job) => ({
          ...job,
          applicants: (job.applicants || []).map((a) =>
            a.id === selectedApplicant.id 
              ? { 
                  ...a, 
                  status: statusUpdateValue
                } 
              : a,
          ),
        })),
      )

      setShowStatusSuccess(true)
      setTimeout(() => setShowStatusSuccess(false), 3000)

      // Close modal
      closeApplicantDetails()

      // If status is interview, store applicant and navigate to schedule-interview
      if (statusUpdateValue === "interview") {
        localStorage.setItem('pendingInterviewApplicant', JSON.stringify(selectedApplicant))
        setTimeout(() => navigate("/schedule-interview"), 500)
      }
    } catch (e) {
      console.error("[v0] Status update error:", e)
      setStatusError("Failed to update status. Please try again.")
    } finally {
      setStatusSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-800 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading applicants...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
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
                <h1 className="text-4xl font-bold text-gray-700">Applicants Overview</h1>
                <p className="text-lg text-gray-600 mt-2">View all applicants who have applied to your job postings</p>
              </div>
            </div>
            <button
              onClick={fetchApplicants}
              className="bg-blue-800 hover:bg-blue-900 text-white p-3 rounded-lg font-semibold transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
          </div>
          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">{error}</div>}
          {successMessage && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
              {successMessage}
            </div>
          )}
        </div>
      </section>

      {/* Jobs with Applicants */}
      <section className="py-8">
        <div className="max-w-6xl mx-auto px-4">
          {jobsWithApplicants.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No applicants yet</h3>
              <p className="text-gray-600">Applicants will appear here once people apply to your jobs.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {jobsWithApplicants.map((job) => (
                <div key={job.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  {/* Job Header */}
                  <div
                    className="p-6 cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors flex justify-between items-center"
                    onClick={() => toggleJobExpansion(job.id)}
                  >
                    <div className="flex items-center space-x-4">
                      <Briefcase className="w-5 h-5 text-blue-800" />
                      <div>
                        <h3 className="font-semibold text-gray-700">{job.job_title}</h3>
                        <p className="text-sm text-gray-600">
                          {job.company_name} • {job.job_location}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-medium text-gray-700">
                        {job.applicants.length} applicant{job.applicants.length !== 1 ? "s" : ""}
                      </span>
                      {expandedJob === job.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                  </div>

                  {/* Applicants List */}
                  {expandedJob === job.id && (
                    <div className="divide-y divide-gray-200">
                      {job.applicants.length === 0 ? (
                        <p className="p-6 text-gray-500 text-center">No applicants for this job yet.</p>
                      ) : (
                        <div className="p-6">
                          <div className="space-y-4">
                            {job.applicants.map((applicant, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-4 bg-white rounded-xl hover:bg-gray-50 transition-colors cursor-pointer border border-gray-100"
                                onClick={() => openApplicantDetails(applicant)}
                              >
                                <div className="flex items-center space-x-4">
                                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                                    <span className="text-white font-semibold text-lg">
                                      {applicant.applicant_name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <h5 className="font-semibold text-gray-900">{applicant.applicant_name}</h5>
                                    <p className="text-sm text-gray-500">{applicant.applicant_email}</p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <div
                                    className={`px-3 py-1 rounded-full border text-xs ${statusBadgeClasses(applicant.status)}`}
                                  >
                                    {statusLabel(applicant.status)}
                                  </div>
                                  {/* Download button (doesn't open modal) */}
                                  {applicant.cv_url && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDownloadCV(applicant.cv_url, `${(applicant.applicant_name || 'applicant').replace(/\s+/g, '_')}_resume.pdf`)
                                      }}
                                      title="Download CV"
                                      className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                                    >
                                      <Download className="w-4 h-4 text-gray-600" />
                                    </button>
                                  )}
                                  <ChevronDown className="w-4 h-4 text-gray-400" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Applicant Details Modal */}
      {selectedApplicant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-md" onClick={closeApplicantDetails} />
          <div
            className="relative bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            style={{ zIndex: 51 }}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-xl">
                    {selectedApplicant.applicant_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h4 className="text-2xl font-bold text-gray-900">{selectedApplicant.applicant_name}</h4>
                  <p className="text-sm text-gray-500">Applicant Details</p>
                </div>
              </div>
              <button
                onClick={closeApplicantDetails}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-8">
              {/* New: Status controls */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">Application Status</span>
                    <span
                      className={`px-2 py-0.5 rounded-full border text-xs ${statusBadgeClasses(statusUpdateValue)}`}
                    >
                      {statusLabel(statusUpdateValue)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={statusUpdateValue}
                      onChange={(e) => setStatusUpdateValue(e.target.value)}
                      className="text-sm border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={saveApplicantStatus}
                      disabled={statusSaving}
                      className={`px-4 py-2 rounded-md text-white text-sm ${statusSaving ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
                    >
                      {statusSaving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
                {statusError && <p className="text-red-600 text-sm mt-2">{statusError}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                    <Mail className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <span
                      className="text-blue-600 hover:underline font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {selectedApplicant.applicant_email}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                    <Phone className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <span className="text-gray-700 font-medium">{selectedApplicant.applicant_mobile}</span>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl border border-purple-100">
                    <MapPin className="w-5 h-5 text-purple-600 flex-shrink-0" />
                    <span className="text-gray-700 font-medium">
                      {selectedApplicant.city}, {selectedApplicant.state}
                    </span>
                  </div>
                  {selectedApplicant.experience && (
                    <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
                      <p className="text-gray-900 font-semibold mb-3">Experience</p>
                      <p className="text-sm text-gray-600 leading-relaxed">{selectedApplicant.experience}</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedApplicant.cv_url ? (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                    <h5 className="text-lg font-semibold text-gray-900">Resume</h5>
                    <button
                      onClick={() => handleDownloadCV(selectedApplicant.cv_url, `${selectedApplicant.applicant_name.replace(/\s+/g, "_")}_resume.pdf`)}
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download CV
                    </button>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                      <p className="text-sm text-gray-600">Preview</p>
                    </div>
                    <div className="relative">
                      {(() => {
                        const applicantKey = getApplicantKey(selectedApplicant)
                        const hasLoadError = cvLoadErrors[applicantKey]
                        // Determine preview URL: use proxy for GCS, direct for server paths
                        let previewUrl = selectedApplicant.cv_url
                        if (selectedApplicant.cv_url && selectedApplicant.cv_url.includes('storage.googleapis.com')) {
                          previewUrl = `${API_BASE_URL}/download?url=${encodeURIComponent(selectedApplicant.cv_url)}`
                        } else if (selectedApplicant.cv_url && selectedApplicant.cv_url.startsWith('/')) {
                          previewUrl = `${API_BASE_URL}${selectedApplicant.cv_url}`
                        }
                        return !hasLoadError ? (
                          <iframe
                            src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                            width="100%"
                            height="500"
                            title={`CV Preview for ${selectedApplicant.applicant_name}`}
                            onError={() => handleCvLoadError(applicantKey)}
                            className="w-full border-0"
                          />
                        ) : (
                          <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-dashed border-gray-300 rounded-lg p-8 text-center">
                            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500 text-base font-medium">Unable to load resume.</p>
                            <p className="text-gray-400 text-sm mt-1">Please download to view.</p>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h5 className="text-lg font-semibold text-gray-900">Resume</h5>
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-dashed border-gray-300 rounded-xl p-8 text-center">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-base font-medium">No resume attached</p>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="text-sm text-gray-500 flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Applied: {new Date(selectedApplicant.created_at).toLocaleDateString()}
                </div>
                <div className="text-sm text-gray-500">
                  Current:{" "}
                  <span
                    className={`px-2 py-0.5 rounded-full border text-xs ${statusBadgeClasses(selectedApplicant.status)}`}
                  >
                    {statusLabel(selectedApplicant.status)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Success Popup */}
      {showStatusSuccess && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-auto">
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Status Updated Successfully!</h3>
              <p className="text-gray-600 mb-6">The application status has been changed to {statusLabel(statusUpdateValue)}.</p>
              <button
                onClick={() => setShowStatusSuccess(false)}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Applicants