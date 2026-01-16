"use client"

import { useState, useEffect } from "react"
import {
  MapPin,
  Clock,
  Building2,
  DollarSign,
  Bookmark,
  Send,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Paperclip,
  X,
  Edit,
  Trash2,
  Download,
} from "lucide-react"
import { getUserSpecificData, setUserSpecificData } from "../utils/tokenUtils"

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const MyJobs = () => {
  const [activeTab, setActiveTab] = useState("status")
  const [appliedJobs, setAppliedJobs] = useState([])
  const [savedJobsList, setSavedJobsList] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedJob, setSelectedJob] = useState(null)
  const [showJobModal, setShowJobModal] = useState(false)
  const [jobDetails, setJobDetails] = useState(null)
  const [jobLoading, setJobLoading] = useState(false)
  const [showAppModal, setShowAppModal] = useState(false)
  const [selectedApp, setSelectedApp] = useState(null)
  const [cvLoadError, setCvLoadError] = useState(false) // New: Track CV load errors

  const [showApplicationForm, setShowApplicationForm] = useState(false)
  const [applicationData, setApplicationData] = useState({
    name: "",
    email: "",
    mobile: "",
    city: "",
    state: "",
    cv: null,
    experience: "",
  })
  const [showPreview, setShowPreview] = useState(false)
  const [isPrefilling, setIsPrefilling] = useState(false)
  const [prefillError, setPrefillError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)
  const [showDuplicateError, setShowDuplicateError] = useState(false)
  const [editingApplicationId, setEditingApplicationId] = useState(null)

  const [statusNotifications, setStatusNotifications] = useState([])
  const [showStatusPopup, setShowStatusPopup] = useState(false)

  // Load saved jobs on mount and set up real-time listener
  useEffect(() => {
    const loadSavedJobs = () => {
      const savedJobsData = getUserSpecificData("savedJobsData", [])
      setSavedJobsList(savedJobsData)
    }

    // Initial load
    loadSavedJobs()

    // Real-time listener for storage changes (when saving/removing from Jobs component)
    const handleStorageChange = (e) => {
      // Listen for changes in the same key pattern
      if (e.key && e.key.includes("savedJobsData")) {
        loadSavedJobs()
      }
    }

    // Listen for custom events (for same-tab updates)
    const handleCustomStorageChange = () => {
      loadSavedJobs()
    }

    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("savedJobsUpdated", handleCustomStorageChange)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("savedJobsUpdated", handleCustomStorageChange)
    }
  }, [])

  // Reload saved jobs when active tab changes to 'saved'
  useEffect(() => {
    if (activeTab === "saved") {
      const savedJobsData = getUserSpecificData("savedJobsData", [])
      setSavedJobsList(savedJobsData)
    }
  }, [activeTab])

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        setLoading(true)
        setError(null)

        // Get token from localStorage
        const token =
          localStorage.getItem("token") ||
          localStorage.getItem("accessToken") ||
          localStorage.getItem("authToken") ||
          localStorage.getItem("jwt") ||
          ""

        if (!token) {
          setError("Please sign in to view your applications.")
          return
        }

        // Fetch applications directly for current user (no profile fetch needed)
        const appRes = await fetch(`${API_BASE_URL}/api/applications`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!appRes.ok) {
          const errorText = await appRes.text()
          console.error("API error response:", errorText)
          throw new Error(`Failed to fetch applications: ${appRes.status} ${appRes.statusText}`)
        }

        const data = await appRes.json()

        // Map data to match JobCard structure
        const mappedJobs = data.map((app) => ({
          ...app,
          appliedDate: getRelativeTime(app.created_at),
          lastUpdate: getRelativeTime(app.created_at),
          status: app.status || "applied",
          logo: app.company_logo || "💼",
        }))

        setAppliedJobs(mappedJobs)

        try {
          const lastStatuses = JSON.parse(localStorage.getItem("lastAppStatuses") || "{}")
          const changes = mappedJobs.filter(
            (a) => lastStatuses[a.id] && lastStatuses[a.id] !== (a.status || "applied"),
          )
          if (changes.length > 0) {
            setStatusNotifications(
              changes.map((a) => ({ id: a.id, job_title: a.job_title, status: a.status || "applied" })),
            )
            setShowStatusPopup(true)
          }
          const nextMap = {}
          mappedJobs.forEach((a) => {
            nextMap[a.id] = a.status || "applied"
          })
          localStorage.setItem("lastAppStatuses", JSON.stringify(nextMap))
        } catch (e) {
          // swallow localStorage errors gracefully
        }
      } catch (err) {
        console.error("Error fetching applications:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (activeTab === "status") {
      fetchApplications()
    }
  }, [activeTab])

  const fetchApplications = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get token from localStorage
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("jwt") ||
        ""

      if (!token) {
        setError("Please sign in to view your applications.")
        return
      }

      // Fetch applications directly for current user (no profile fetch needed)
      const appRes = await fetch(`${API_BASE_URL}/api/applications`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!appRes.ok) {
        const errorText = await appRes.text()
        console.error("API error response:", errorText)
        throw new Error(`Failed to fetch applications: ${appRes.status} ${appRes.statusText}`)
      }

      const data = await appRes.json()

      // Map data to match JobCard structure
      const mappedJobs = data.map((app) => ({
        ...app,
        appliedDate: getRelativeTime(app.created_at),
        lastUpdate: getRelativeTime(app.created_at),
        status: app.status || "applied",
        logo: app.company_logo || "💼",
      }))

      setAppliedJobs(mappedJobs)

      try {
        const lastStatuses = JSON.parse(localStorage.getItem("lastAppStatuses") || "{}")
        const changes = mappedJobs.filter(
          (a) => lastStatuses[a.id] && lastStatuses[a.id] !== (a.status || "applied"),
        )
        if (changes.length > 0) {
          setStatusNotifications(
            changes.map((a) => ({ id: a.id, job_title: a.job_title, status: a.status || "applied" })),
          )
          setShowStatusPopup(true)
        }
        const nextMap = {}
        mappedJobs.forEach((a) => {
          nextMap[a.id] = a.status || "applied"
        })
        localStorage.setItem("lastAppStatuses", JSON.stringify(nextMap))
      } catch (e) {
        // ignore localStorage failures
      }
    } catch (err) {
      console.error("Error fetching applications:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchJobDetails = async (jobId) => {
    try {
      setJobLoading(true)
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("jwt") ||
        ""

      const res = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`, {
        method: "GET",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (!res.ok) {
        throw new Error("Failed to fetch job details")
      }

      const data = await res.json()
      setJobDetails(data)
    } catch (err) {
      console.error("Error fetching job details:", err)
    } finally {
      setJobLoading(false)
    }
  }

  const handleJobClick = (application) => {
    setSelectedJob(application)
    fetchJobDetails(application.job_id)
    setShowJobModal(true)
  }

  const handleSavedJobClick = (job) => {
    setSelectedJob(job)
    fetchJobDetails(job.id)
    setShowJobModal(true)
  }

  const handleViewApp = (application) => {
    setSelectedApp(application)
    setShowAppModal(true)
    setCvLoadError(false) // Reset CV error on open
  }

  const handleWithdraw = async (appId) => {
    if (!confirm("Are you sure you want to withdraw this application?")) return

    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("jwt") ||
        ""

      const res = await fetch(`${API_BASE_URL}/api/applications/${appId}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (res.ok) {
        fetchApplications()
      } else {
        alert("Failed to withdraw application")
      }
    } catch (err) {
      console.error("Withdraw error:", err)
      alert("Error withdrawing application")
    }
  }

  const handleReapply = (application) => {
    setSelectedApp(application)
    setApplicationData({
      name: application.applicant_name || "",
      email: application.applicant_email || "",
      mobile: application.applicant_mobile || "",
      city: application.city || "",
      state: application.state || "",
      cv: null,
      experience: application.experience || "",
    })
    setSelectedJob({
      id: application.job_id,
      job_title: application.job_title,
    })
    setEditingApplicationId(application.id)
    setShowApplicationForm(true)
  }

  const handleRemoveSavedJob = (jobId) => {
    // Get and update user-specific saved jobs data
    const savedJobsData = getUserSpecificData("savedJobsData", [])
    const updatedJobsData = savedJobsData.filter((j) => j.id !== jobId)
    setUserSpecificData("savedJobsData", updatedJobsData)

    // Get and update user-specific saved jobs IDs
    const savedJobs = getUserSpecificData("savedJobs", [])
    const updatedSavedJobs = savedJobs.filter((id) => id !== jobId)
    setUserSpecificData("savedJobs", updatedSavedJobs)

    // Update local state
    setSavedJobsList(updatedJobsData)

    // Dispatch custom event to notify other components in real-time
    window.dispatchEvent(new CustomEvent("savedJobsUpdated", { detail: { removed: jobId } }))
  }

  const handleDownloadCV = async (cvUrl, fileName) => {
    if (!cvUrl) return;
    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("jwt") ||
        ""

      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {}

      // Check if URL is GCS or server-relative path
      let downloadUrl = cvUrl
      if (cvUrl.includes('storage.googleapis.com')) {
        // GCS URL - use authenticated backend proxy
        downloadUrl = `${API_BASE_URL}/download?url=${encodeURIComponent(cvUrl)}`
      } else if (cvUrl.startsWith('/')) {
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
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Download failed:", error)
      alert("Failed to download CV")
    }
  }

  const handleApply = async (job) => {
    setSelectedJob(job)
    setEditingApplicationId(null)
    setIsPrefilling(true)
    setPrefillError("")
    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("jwt") ||
        ""

      const res = await fetch(`${API_BASE_URL}/api/userprofile`, {
        method: "GET",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (res.ok) {
        const profile = await res.json()
        const firstName = profile?.first_name || ""
        const lastName = profile?.last_name || ""
        const fullName = firstName || lastName ? [firstName, lastName].filter(Boolean).join(" ") : profile?.name || ""

        setApplicationData({
          name: fullName,
          email: profile?.email || "",
          mobile: profile?.phone || profile?.mobile || "",
          city: profile?.city || "",
          state: profile?.state || "",
          cv: null,
          experience: profile?.profile_summary || profile?.experience || "",
        })
      } else {
        if (res.status === 401 || res.status === 403) {
          setPrefillError("Sign in required to prefill your application. You can still edit fields manually.")
        } else {
          setPrefillError("Could not prefill from your profile. You can continue by entering details manually.")
        }
        setApplicationData({
          name: "",
          email: "",
          mobile: "",
          city: "",
          state: "",
          experience: "",
          cv: null,
        })
      }
    } catch (err) {
      console.error("Prefill error:", err)
      setPrefillError("Network error while fetching your profile. Please fill the form manually.")
    } finally {
      setIsPrefilling(false)
      setShowApplicationForm(true)
    }
  }

  const handleApplicationChange = (field, value) => {
    setApplicationData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    setApplicationData((prev) => ({
      ...prev,
      cv: file,
    }))
  }

  const handleSubmitApplication = async () => {
    if (!selectedJob?.id) {
      setSubmitError("No job selected.")
      return
    }
    setSubmitError("")
    setIsSubmitting(true)

    try {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        localStorage.getItem("authToken") ||
        localStorage.getItem("jwt") ||
        ""

      const fd = new FormData()
      fd.append("applicant_name", (applicationData.name || "").trim())
      fd.append("applicant_email", (applicationData.email || "").trim())
      fd.append("applicant_mobile", (applicationData.mobile || "").trim())
      fd.append("city", (applicationData.city || "").trim())
      fd.append("state", (applicationData.state || "").trim())
      fd.append("experience", applicationData.experience || "")
      if (!editingApplicationId) {
        fd.append("job_id", String(selectedJob.id))
      }
      if (applicationData.cv) {
        fd.append("cv", applicationData.cv)
      }

      const url = editingApplicationId
        ? `${API_BASE_URL}/api/applications/${editingApplicationId}`
        : `${API_BASE_URL}/api/applications`
      const method = editingApplicationId ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: fd,
      })

      if (res.ok) {
        if (!editingApplicationId && selectedJob?.id) {
          handleRemoveSavedJob(selectedJob.id)
        }

        setShowSuccess(true)
        setShowApplicationForm(false)
        setShowPreview(false)
        setSelectedJob(null)
        setEditingApplicationId(null)
        setApplicationData({
          name: "",
          email: "",
          mobile: "",
          city: "",
          state: "",
          cv: null,
          experience: "",
        })
      } else {
        const errorData = await res.json().catch(() => ({}))
        if (errorData.error === "You have already applied for this job") {
          setShowDuplicateError(true)
          setShowApplicationForm(false)
          setShowPreview(false)
          setSelectedJob(null)
          setEditingApplicationId(null)
          setApplicationData({
            name: "",
            email: "",
            mobile: "",
            city: "",
            state: "",
            cv: null,
            experience: "",
          })
        } else {
          setSubmitError(
            errorData.error ||
              "There was a problem submitting your application. Please verify required fields and try again.",
          )
        }
      }
    } catch (err) {
      console.error("Submit error:", err)
      setSubmitError(
        (err && err.message) ||
          "There was a problem submitting your application. Please verify required fields and try again.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const getRelativeTime = (dateString) => {
    const now = new Date()
    const appliedDate = new Date(dateString)
    const diffTime = Math.abs(now - appliedDate)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return `${diffDays} days ago`
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case "applied":
        return <CheckCircle className="w-4 h-4 text-blue-600" />
      case "under_review":
        return <AlertCircle className="w-4 h-4 text-yellow-600" />
      case "interview_scheduled":
        return <Clock className="w-4 h-4 text-blue-600" />
      case "hired":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-600" />
      case "withdrawn":
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case "applied":
        return "Applied"
      case "under_review":
        return "Under Review"
      case "interview_scheduled":
        return "Interview"
      case "hired":
        return "Hired"
      case "rejected":
        return "Rejected"
      case "withdrawn":
        return "Withdrawn"
      default:
        return "Unknown"
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "applied":
        return "bg-blue-50 text-blue-700 border-blue-200"
      case "under_review":
        return "bg-yellow-50 text-yellow-700 border-yellow-200"
      case "interview_scheduled":
        return "bg-blue-50 text-blue-700 border-blue-200"
      case "hired":
        return "bg-green-50 text-green-700 border-green-200"
      case "rejected":
        return "bg-red-50 text-red-700 border-red-200"
      case "withdrawn":
        return "bg-red-50 text-red-700 border-red-200"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  const JobCard = ({ job, type }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-2xl">{job.logo}</div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-700 mb-1">{job.title}</h3>
            <div className="flex items-center space-x-2 text-gray-600 mb-2">
              <Building2 className="w-4 h-4" />
              <span className="text-sm">{job.company}</span>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <MapPin className="w-4 h-4" />
                <span>{job.location}</span>
              </div>
              {job.salary && (
                <div className="flex items-center space-x-1">
                  <DollarSign className="w-4 h-4" />
                  <span>{job.salary}</span>
                </div>
              )}
              {job.type && <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">{job.type}</span>}
            </div>
          </div>
        </div>
        {type === "saved" && (
          <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <Bookmark className="w-5 h-5 fill-current" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          <span>{type === "saved" ? `Posted ${job.postedDate}` : `Applied ${job.appliedDate}`}</span>
        </div>

        {type === "applied" && (
          <div
            className={`flex items-center space-x-2 px-3 py-1 rounded-full border text-sm ${getStatusColor(job.status)}`}
          >
            {getStatusIcon(job.status)}
            <span>{getStatusText(job.status)}</span>
          </div>
        )}

        {type === "saved" && (
          <div className="flex space-x-2">
            <button className="px-4 py-2 text-blue-800 border border-blue-800 rounded-lg hover:bg-blue-50 transition-colors text-sm">
              View Details
            </button>
            <button className="px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors text-sm flex items-center space-x-1">
              <Send className="w-4 h-4" />
              <span>Apply Now</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )

  const SavedJobCard = ({ job }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-4 flex-1 cursor-pointer" onClick={() => handleSavedJobClick(job)}>
          <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-2xl">
            {job.logo || "💼"}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-700 mb-1 text-left">{job.job_title || "N/A"}</h3>
            <div className="flex items-center space-x-2 text-gray-600 mb-2">
              <Building2 className="w-4 h-4" />
              <span className="text-sm">{job.company_name || "N/A"}</span>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
              <div className="flex items-center space-x-1">
                <MapPin className="w-4 h-4" />
                <span>{job.job_location || "N/A"}</span>
              </div>
              <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                {Array.isArray(job.job_type) && job.job_type.length > 0 ? job.job_type[0] : "N/A"}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>Posted {job.created_at ? new Date(job.created_at).toLocaleDateString() : "N/A"}</span>
            </div>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleRemoveSavedJob(job.id)
          }}
          className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <Bookmark className="w-5 h-5 fill-current" />
        </button>
      </div>

      <div className="flex justify-end">
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleApply(job)
          }}
          disabled={isPrefilling}
          className={`px-4 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors text-sm flex items-center space-x-1 ${
            isPrefilling ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <Send className="w-4 h-4" />
          <span>{isPrefilling ? "Preparing..." : "Apply Now"}</span>
        </button>
      </div>
    </div>
  )

  const StatusCard = ({ application }) => (
    <div
      className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => handleJobClick(application)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-2xl">
            {application.logo}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-700 mb-1">{application.job_title}</h3>
            <div className="flex items-center space-x-2 text-gray-600 mb-1">
              <Paperclip className="w-4 h-4" />
              <span className="text-sm">{application.company_name}</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600 mb-2">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">{application.job_location}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>Applied {application.appliedDate}</span>
            </div>
          </div>
        </div>
        <div
          className={`flex items-center space-x-2 px-3 py-1 rounded-full border text-sm ${getStatusColor(application.status)}`}
        >
          {getStatusIcon(application.status)}
          <span>{getStatusText(application.status)}</span>
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleViewApp(application)
          }}
          className="px-4 py-2 text-blue-800 border border-blue-800 rounded-lg hover:bg-blue-50 transition-colors text-sm flex items-center space-x-1"
        >
          <Eye className="w-4 h-4" />
          <span>View Application</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleReapply(application)
          }}
          className="px-4 py-2 text-green-800 border border-green-800 rounded-lg hover:bg-green-50 transition-colors text-sm flex items-center space-x-1"
        >
          <Edit className="w-4 h-4" />
          <span>Reapply</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleWithdraw(application.id)
          }}
          className="px-4 py-2 text-red-800 border border-red-800 rounded-lg hover:bg-red-50 transition-colors text-sm flex items-center space-x-1"
        >
          <Trash2 className="w-4 h-4" />
          <span>Withdraw</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="bg-white min-h-screen">
      {/* Header Section */}
      <section className="bg-gradient-to-br from-blue-50 to-white py-12">
        <div className="w-full px-4">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl font-bold text-gray-700 mb-4 text-center">
              My <span className="text-blue-800">Jobs</span>
            </h1>
            <p className="text-lg text-gray-600 text-center mb-8">
              Manage your saved jobs, applications, and track your progress
            </p>
          </div>
        </div>
      </section>

      {/* Navigation Tabs */}
      <section className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="w-full px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex space-x-8">
              {[
                { id: "saved", label: "Saved Jobs", count: savedJobsList.length },
                { id: "status", label: "Application Status", count: appliedJobs.length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? "border-blue-800 text-blue-800"
                      : "border-transparent text-gray-600 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-8">
        <div className="w-full px-4">
          <div className="max-w-6xl mx-auto">
            {activeTab === "saved" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-700">Saved Jobs</h2>
                </div>

                {savedJobsList.length > 0 ? (
                  <div className="space-y-4">
                    {savedJobsList.map((job) => (
                      <SavedJobCard key={job.id} job={job} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Bookmark className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No saved jobs yet</h3>
                    <p className="text-gray-600">Start browsing jobs and save the ones you're interested in!</p>
                  </div>
                )}
              </div>
            )}

            {/* Application Status Tab */}
            {activeTab === "status" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-700">Application Status</h2>
                </div>

                {loading && (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading your applications...</p>
                  </div>
                )}

                {error && (
                  <div className="text-center py-12">
                    <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-4" />
                    <p className="text-red-600 mb-2">{error}</p>
                    <button
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {!loading && !error && (
                  <>
                    <div className="space-y-4">
                      {appliedJobs.map((application) => (
                        <StatusCard key={application.id} application={application} />
                      ))}
                    </div>

                    {appliedJobs.length === 0 && (
                      <div className="text-center py-12">
                        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">No application updates</h3>
                        <p className="text-gray-600">Your application status updates will appear here!</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Job Details Modal */}
      {showJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowJobModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-700">Job Details</h2>
              <button
                onClick={() => setShowJobModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              {jobLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">Loading job details...</p>
                </div>
              ) : jobDetails ? (
                <>
                  <div className="flex items-start space-x-4 mb-6">
                    <div className="w-16 h-16 bg-blue-50 rounded-lg flex items-center justify-center text-3xl">
                      {selectedJob.logo}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-semibold text-gray-700 mb-2">
                        {jobDetails.job_title || selectedJob.job_title}
                      </h3>
                      <div className="flex items-center space-x-4 text-gray-600 mb-2">
                        <div className="flex items-center space-x-1">
                          <Building2 className="w-4 h-4" />
                          <span>{jobDetails.company_name || selectedJob.company_name}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-4 h-4" />
                          <span>{jobDetails.job_location || selectedJob.job_location}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                          {jobDetails.job_type?.[0] || "N/A"}
                        </span>
                        <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                          {jobDetails.work_experience || "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Job Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Skills */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-700 mb-3 text-left">Skills</h4>
                      <div className="flex flex-wrap gap-2 justify-start">
                        {jobDetails.skills ? (
                          jobDetails.skills.split(",").map((skill, index) => (
                            <span key={index} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                              {skill.trim()}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-600">N/A</span>
                        )}
                      </div>
                    </div>

                    {/* Education */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-700 mb-3 text-left">Education</h4>
                      <p className="text-gray-600 text-sm text-left">{jobDetails.education || "N/A"}</p>
                    </div>

                    {/* Languages */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-700 mb-3 text-left">Languages</h4>
                      <div className="space-y-1 text-left">
                        {jobDetails.languages ? (
                          jobDetails.languages.split(",").map((language, index) => (
                            <p key={index} className="text-gray-600 text-sm text-left">
                              {language.trim()}
                            </p>
                          ))
                        ) : (
                          <p className="text-gray-600">N/A</p>
                        )}
                      </div>
                    </div>

                    {/* Pay */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-700 mb-3 text-left">Pay</h4>
                      <div className="flex items-center space-x-2 justify-start">
                        <span className="w-4 h-4 text-green-600 font-medium">₹</span>
                        <span className="text-gray-700 font-medium">
                          {jobDetails.pay_min && jobDetails.pay_max
                            ? `${jobDetails.pay_min} - ${jobDetails.pay_max}`
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mt-6">
                    <h4 className="text-lg font-semibold text-gray-700 mb-3 text-left">Description</h4>
                    <p className="text-gray-600 leading-relaxed text-left">{jobDetails.job_description || "N/A"}</p>
                  </div>

                  {/* Responsibilities */}
                  <div className="mt-6">
                    <h4 className="text-lg font-semibold text-gray-700 mb-3 text-left">Responsibilities</h4>
                    <ul className="space-y-2 text-left">
                      {jobDetails.responsibilities ? (
                        jobDetails.responsibilities.split(",").map((responsibility, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <span className="w-1.5 h-1.5 bg-blue-800 rounded-full mt-2 flex-shrink-0" />
                            <span className="text-gray-600 text-sm">{responsibility.trim()}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-gray-600">N/A</li>
                      )}
                    </ul>
                  </div>

                  {/* Benefits */}
                  <div className="mt-6">
                    <h4 className="text-lg font-semibold text-gray-700 mb-3 text-left">Benefits</h4>
                    <ul className="space-y-2 text-left">
                      {jobDetails.benefits ? (
                        jobDetails.benefits.split(",").map((benefit, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <span className="w-1.5 h-1.5 bg-green-600 rounded-full mt-2 flex-shrink-0" />
                            <span className="text-gray-600 text-sm">{benefit.trim()}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-gray-600">N/A</li>
                      )}
                    </ul>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-4" />
                  <p className="text-gray-600">Failed to load job details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Application Details Modal */}
      {showAppModal && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowAppModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {" "}
            {/* Increased width for better CV preview */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-800">Application Details</h2>
              <button
                onClick={() => setShowAppModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Personal Information Section */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                  <Paperclip className="w-5 h-5 text-blue-600" />
                  <span>Personal Information</span>
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-blue-100 last:border-b-0">
                    <span className="text-sm font-medium text-gray-600">Full Name</span>
                    <span className="text-sm text-gray-900 font-medium">{selectedApp.applicant_name}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-blue-100 last:border-b-0">
                    <span className="text-sm font-medium text-gray-600">Email</span>
                    <span className="text-sm text-gray-900 font-medium">{selectedApp.applicant_email}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-blue-100 last:border-b-0">
                    <span className="text-sm font-medium text-gray-600">Mobile</span>
                    <span className="text-sm text-gray-900 font-medium">{selectedApp.applicant_mobile}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 py-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">City</span>
                      <span className="text-sm text-gray-900 font-medium">{selectedApp.city}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">State</span>
                      <span className="text-sm text-gray-900 font-medium">{selectedApp.state}</span>
                    </div>
                  </div>
                  <div className="py-2">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium text-gray-600">Experience</span>
                      <span className="text-sm text-gray-900 font-medium whitespace-pre-wrap max-w-xs">
                        {selectedApp.experience || "Not provided"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CV Section */}
              {selectedApp.cv_url && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                    <Paperclip className="w-5 h-5 text-green-600" />
                    <span>Resume</span>
                  </h3>
                  <div className="space-y-4">
                    {cvLoadError ? (
                      <div className="text-center py-4 text-red-600">
                        <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                        <p className="text-sm">Failed to load preview. Use download below.</p>
                      </div>
                    ) : (
                      <iframe
                        src={(() => {
                          let previewUrl = selectedApp.cv_url;
                          if (selectedApp.cv_url.includes('storage.googleapis.com')) {
                            previewUrl = `${API_BASE_URL}/download?url=${encodeURIComponent(selectedApp.cv_url)}`;
                          } else if (selectedApp.cv_url.startsWith('/')) {
                            previewUrl = `${API_BASE_URL}${selectedApp.cv_url}`;
                          }
                          return `${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`;
                        })()}
                        width="100%"
                        height="600px"
                        style={{ border: "1px solid #e5e7eb", borderRadius: "0.5rem" }}
                        title="Resume Preview"
                        onError={() => setCvLoadError(true)} // Fallback on load error
                      />
                    )}
                    <button
                      onClick={() => handleDownloadCV(selectedApp.cv_url, `${selectedApp.applicant_name || 'applicant'}_resume.pdf`)}
                      className="inline-flex items-center justify-center space-x-2 text-green-700 hover:text-green-800 font-medium transition-colors bg-white px-4 py-2 rounded-md border border-green-200 hover:border-green-300 hover:shadow-sm w-full"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download CV</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Job Information Section */}
              <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg p-4 border border-purple-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2">
                  <Building2 className="w-5 h-5 text-purple-600" />
                  <span>Job Information</span>
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-purple-100 last:border-b-0">
                    <span className="text-sm font-medium text-gray-600">Job Title</span>
                    <span className="text-sm text-gray-900 font-medium">{selectedApp.job_title}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-purple-100 last:border-b-0">
                    <span className="text-sm font-medium text-gray-600">Company</span>
                    <span className="text-sm text-gray-900 font-medium">{selectedApp.company_name}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-purple-100 last:border-b-0">
                    <span className="text-sm font-medium text-gray-600">Location</span>
                    <span className="text-sm text-gray-900 font-medium">{selectedApp.job_location}</span>
                  </div>
                </div>
              </div>

              {/* Submission Details */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-gray-600" />
                  <span>Submission Details</span>
                </h3>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm font-medium text-gray-600">Submitted Date</span>
                  <span className="text-sm text-gray-900 font-medium">
                    {new Date(selectedApp.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showApplicationForm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setShowApplicationForm(false)}
          />

          <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-700">
                {editingApplicationId ? "Update Application for" : "Apply for"} {selectedJob?.job_title || "N/A"}
              </h2>
              <button
                onClick={() => setShowApplicationForm(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {!showPreview ? (
                <div className="space-y-6">
                  {prefillError && (
                    <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                      {prefillError}
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                        <input
                          type="text"
                          value={applicationData.name}
                          onChange={(e) => handleApplicationChange("name", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter your full name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                        <input
                          type="email"
                          value={applicationData.email}
                          onChange={(e) => handleApplicationChange("email", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter your email address"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number *</label>
                        <input
                          type="tel"
                          value={applicationData.mobile}
                          onChange={(e) => handleApplicationChange("mobile", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter your mobile number"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Location Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                        <input
                          type="text"
                          value={applicationData.city}
                          onChange={(e) => handleApplicationChange("city", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter your city"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
                        <input
                          type="text"
                          value={applicationData.state}
                          onChange={(e) => handleApplicationChange("state", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter your state"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Upload CV</h3>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="cv-upload"
                      />
                      <label htmlFor="cv-upload" className="cursor-pointer">
                        <div className="text-gray-600">
                          <svg
                            className="mx-auto h-12 w-12 text-gray-400"
                            stroke="currentColor"
                            fill="none"
                            viewBox="0 0 48 48"
                          >
                            <path
                              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <p className="mt-2 text-sm">
                            <span className="font-medium text-blue-600 hover:text-blue-500">Click to upload</span> or
                            drag and drop
                          </p>
                          <p className="text-xs text-gray-500">PDF, DOC, DOCX up to 10MB</p>
                        </div>
                      </label>
                      {applicationData.cv && (
                        <p className="mt-2 text-sm text-green-600">Selected: {applicationData.cv.name}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Job Relevant Experience</h3>
                    <textarea
                      value={applicationData.experience}
                      onChange={(e) => handleApplicationChange("experience", e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Describe your relevant experience for this position..."
                    />
                  </div>

                  <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setShowApplicationForm(false)}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setShowPreview(true)}
                      className="px-6 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors"
                    >
                      Review Application
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">Review Your Application</h3>

                  {submitError && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                      {submitError}
                    </div>
                  )}

                  <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-700">Name</h4>
                        <p className="text-gray-600">{applicationData.name}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-700">Email</h4>
                        <p className="text-gray-600">{applicationData.email}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-700">Mobile</h4>
                        <p className="text-gray-600">{applicationData.mobile}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-700">Location</h4>
                        <p className="text-gray-600">
                          {applicationData.city}, {applicationData.state}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-700">CV</h4>
                        <p className="text-gray-600">
                          {applicationData.cv?.name || (editingApplicationId ? "Keep existing CV" : "No file selected")}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Experience</h4>
                      <p className="text-gray-600 whitespace-pre-wrap">{applicationData.experience}</p>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setShowPreview(false)}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      disabled={isSubmitting}
                    >
                      Back to Edit
                    </button>
                    <button
                      onClick={handleSubmitApplication}
                      disabled={isSubmitting}
                      className={`px-6 py-2 bg-green-600 text-white rounded-lg transition-colors ${
                        isSubmitting ? "opacity-60 cursor-not-allowed" : "hover:bg-green-700"
                      }`}
                    >
                      {isSubmitting ? "Submitting..." : "Submit Application"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowSuccess(false)} />
          <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-green-700 mb-2">Success!</h3>
            <p className="text-gray-600 mb-4">Your application has been submitted successfully.</p>
            <button
              onClick={() => setShowSuccess(false)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showDuplicateError && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setShowDuplicateError(false)} />
          <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-red-700 mb-2">Already Applied!</h3>
            <p className="text-gray-600 mb-4">You have already applied for this job.</p>
            <button
              onClick={() => setShowDuplicateError(false)}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showStatusPopup && statusNotifications.length > 0 && (
        <div className="fixed top-4 right-4 z-[80] max-w-sm w-full">
          <div className="bg-white rounded-xl border border-gray-200 shadow-2xl overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-white border-b border-gray-200 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">Application updates</span>
              <button
                className="p-1 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                onClick={() => setShowStatusPopup(false)}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
              {statusNotifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-2 px-3 py-2 rounded-lg border ${getStatusColor(n.status)}`}
                >
                  {getStatusIcon(n.status)}
                  <div className="text-sm">
                    <p className="font-medium text-gray-700">Status changed to {getStatusText(n.status)}</p>
                    <p className="text-gray-600">for {n.job_title}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-gray-200">
              <button
                onClick={() => setShowStatusPopup(false)}
                className="w-full px-3 py-2 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors text-sm"
              >
                View in Application Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MyJobs