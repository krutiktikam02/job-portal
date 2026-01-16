"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Building2,
  MapPin,
  Users,
  GraduationCap,
  Languages,
  FileText,
  Award,
  Gift,
  Save,
  Eye,
  Edit3,
  Trash2,
  AlertTriangle,
  X,
  Clock,
  CheckCircle,
} from "lucide-react"

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const ActiveJobs = () => {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingJob, setEditingJob] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editFormData, setEditFormData] = useState({})

  const jobTypeOptions = [
    "Full-time",
    "Part-time",
    "Contract",
    "Internship",
    "Remote",
    "Fresher",
    "Freelance",
    "Temporary",
  ]

  useEffect(() => {
    fetchUserJobs()
  }, [])

  const fetchUserJobs = async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No authentication token found")
      }
      const response = await fetch(`${API_BASE_URL}/api/jobs`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      if (!response.ok) {
        throw new Error("Failed to fetch jobs")
      }
      const data = await response.json()
      // Assuming the backend returns only user's jobs when authenticated
      const normalizedJobs = data.map((job) => ({
        ...job,
        job_type: Array.isArray(job.job_type) ? job.job_type : job.job_type ? [job.job_type] : [],
      }))
      setJobs(normalizedJobs)
      setError(null)
    } catch (err) {
      console.error("Error fetching jobs:", err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (job) => {
    setEditFormData({
      id: job.id,
      postingAs: job.posting_as,
      consultancyHiringFor: job.consultancy_hiring_for || "",
      companyName: job.company_name,
      jobTitle: job.job_title,
      jobLocation: job.job_location,
      jobType: job.job_type,
      skills: job.skills,
      education: job.education,
      languages: job.languages || "",
      payMin: job.pay_min,
      payMax: job.pay_max,
      jobDescription: job.job_description,
      workExperience: job.work_experience,
      responsibilities: job.responsibilities,
      benefits: job.benefits || "",
      aboutCompany: job.about_company || "",
      companyInfo: job.company_info || "",
    })
    setEditingJob(job)
  }

  const handleCancelEdit = () => {
    setEditingJob(null)
    setEditFormData({})
  }

  const handleSaveEdit = async () => {
    setIsSubmitting(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No authentication token found")
      }
      const response = await fetch(`${API_BASE_URL}/api/jobs/${editFormData.id}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editFormData),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update job")
      }
      // Refetch jobs
      await fetchUserJobs()
      setEditingJob(null)
      setEditFormData({})
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (err) {
      console.error("Error updating job:", err)
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = (jobId) => {
    setShowDeleteConfirm(jobId)
  }

  const confirmDelete = async () => {
    if (!showDeleteConfirm) return
    setIsSubmitting(true)
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No authentication token found")
      }
      const response = await fetch(`${API_BASE_URL}/api/jobs/${showDeleteConfirm}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete job")
      }
      // Refetch jobs
      await fetchUserJobs()
    } catch (err) {
      console.error("Error deleting job:", err)
      setError(err.message)
    } finally {
      setIsSubmitting(false)
      setShowDeleteConfirm(null)
    }
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(null)
  }

  const handleInputChange = (field, value) => {
    setEditFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleJobTypeChange = (type) => {
    setEditFormData((prev) => {
      const jobTypes = prev.jobType.includes(type)
        ? prev.jobType.filter((t) => t !== type)
        : [...prev.jobType, type]
      return { ...prev, jobType: jobTypes }
    })
  }

  if (isLoading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading jobs...</div>
      </div>
    )
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Header Section */}
      <section className="bg-gradient-to-br from-blue-50 to-white py-12">
        <div className="w-full px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                
              </button>
              <h1 className="text-4xl font-bold text-gray-700">Your Active Jobs</h1>
              <div className="w-0" /> {/* Spacer for alignment */}
            </div>
            <p className="text-lg text-gray-600 text-center">Manage your job postings here</p>
          </div>
        </div>
      </section>

      {/* Jobs List */}
      <section className="py-16">
        <div className="w-full px-4">
          <div className="max-w-6xl mx-auto">
            {error && (
              <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg">
                {error}
              </div>
            )}
            {jobs.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No active jobs</h3>
                <p className="text-gray-600">Post your first job to get started.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {jobs.map((job) => (
                  <div key={job.id} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-700 mb-2">{job.job_title}</h3>
                        <div className="flex items-center space-x-4 text-gray-600 mb-2">
                          <div className="flex items-center space-x-1">
                            <Building2 className="w-4 h-4" />
                            <span>{job.company_name}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-4 h-4" />
                            <span>{job.job_location}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 mb-2">
                          {job.job_type.map((type) => (
                            <span key={type} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                              {type}
                            </span>
                          ))}
                          <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                            ₹{job.pay_min} - ₹{job.pay_max}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>Posted {new Date(job.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(job)}
                          className="p-2 text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <Edit3 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(job.id)}
                          className="p-2 text-red-600 hover:text-red-800 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-600 mb-4">{job.job_description.substring(0, 150)}...</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Edit Modal */}
      {editingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-700">Edit Job: {editingJob.job_title}</h2>
              <button onClick={handleCancelEdit} className="p-2 text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-8">
              {/* Posting As */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  You're posting this job as a:
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="company"
                      checked={editFormData.postingAs === "company"}
                      onChange={(e) => handleInputChange("postingAs", e.target.value)}
                      className="text-blue-800 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">Company / Business</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      value="consultancy"
                      checked={editFormData.postingAs === "consultancy"}
                      onChange={(e) => handleInputChange("postingAs", e.target.value)}
                      className="text-blue-800 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">Consultancy</span>
                  </label>
                </div>
              </div>

              {/* Consultancy Hiring For */}
              {editFormData.postingAs === "consultancy" && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Company you are hiring for *
                  </label>
                  <input
                    type="text"
                    value={editFormData.consultancyHiringFor}
                    onChange={(e) => handleInputChange("consultancyHiringFor", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter company name you're hiring for"
                  />
                </div>
              )}

              {/* Company Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Your {editFormData.postingAs === "consultancy" ? "Consultancy" : "Company"} Name *
                </label>
                <input
                  type="text"
                  value={editFormData.companyName}
                  onChange={(e) => handleInputChange("companyName", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={`Enter your ${editFormData.postingAs === "consultancy" ? "consultancy" : "company"} name`}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Job Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Job Title *</label>
                  <input
                    type="text"
                    value={editFormData.jobTitle}
                    onChange={(e) => handleInputChange("jobTitle", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Senior Frontend Developer"
                  />
                </div>

                {/* Job Location */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Job Location *</label>
                  <input
                    type="text"
                    value={editFormData.jobLocation}
                    onChange={(e) => handleInputChange("jobLocation", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., San Francisco, CA or Remote"
                  />
                </div>
              </div>

              {/* Job Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Job Type *</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {jobTypeOptions.map((type) => (
                    <label key={type} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        value={type}
                        checked={editFormData.jobType.includes(type)}
                        onChange={() => handleJobTypeChange(type)}
                        className="text-blue-800 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Requirements Section */}
              <div className="space-y-6">
                {/* Skills */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Skills *</label>
                  <textarea
                    value={editFormData.skills}
                    onChange={(e) => handleInputChange("skills", e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., React, JavaScript, Node.js, Python..."
                  />
                </div>

                {/* Education */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Education *</label>
                  <textarea
                    value={editFormData.education}
                    onChange={(e) => handleInputChange("education", e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Bachelor's degree in Computer Science or related field..."
                  />
                </div>

                {/* Languages */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Languages</label>
                  <textarea
                    value={editFormData.languages}
                    onChange={(e) => handleInputChange("languages", e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., English (Native), Spanish (Professional), French (Conversational)..."
                  />
                </div>

                {/* Pay Range */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Pay Range *</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 text-lg">₹</span>
                      <input
                        type="text"
                        value={editFormData.payMin}
                        onChange={(e) => handleInputChange("payMin", e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        placeholder="Minimum salary (e.g., 800000)"
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 text-lg">₹</span>
                      <input
                        type="text"
                        value={editFormData.payMax}
                        onChange={(e) => handleInputChange("payMax", e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        placeholder="Maximum salary (e.g., 1200000)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Job Description Section */}
              <div className="space-y-6">
                {/* Job Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Job Description *</label>
                  <textarea
                    value={editFormData.jobDescription}
                    onChange={(e) => handleInputChange("jobDescription", e.target.value)}
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    placeholder="Describe the role, company culture, and what makes this opportunity exciting..."
                  />
                </div>

                {/* Work Experience */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Work Experience Required *
                  </label>
                  <textarea
                    value={editFormData.workExperience}
                    onChange={(e) => handleInputChange("workExperience", e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    placeholder="Specify the required work experience, years of experience, and relevant background..."
                  />
                </div>

                {/* Responsibilities */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Responsibilities *</label>
                  <textarea
                    value={editFormData.responsibilities}
                    onChange={(e) => handleInputChange("responsibilities", e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    placeholder="List the key responsibilities for this role, e.g., Develop new user-facing features using React.js..."
                  />
                </div>

                {/* Benefits */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Benefits</label>
                  <textarea
                    value={editFormData.benefits}
                    onChange={(e) => handleInputChange("benefits", e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    placeholder="List the benefits offered, e.g., Health insurance, Flexible working hours, Remote work options..."
                  />
                </div>

                {/* About Company */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">About Company</label>
                  <textarea
                    value={editFormData.aboutCompany}
                    onChange={(e) => handleInputChange("aboutCompany", e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    placeholder="Describe your company, its mission, values, and culture..."
                  />
                </div>

                {/* Company Info */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Company Info</label>
                  <textarea
                    value={editFormData.companyInfo}
                    onChange={(e) => handleInputChange("companyInfo", e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    placeholder="Additional information about the company, such as size, founding year, etc..."
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-6">
                <button
                  onClick={handleCancelEdit}
                  className="px-8 py-3 border border-blue-800 text-blue-800 rounded-lg hover:bg-blue-50 transition-colors inline-flex items-center space-x-2"
                  disabled={isSubmitting}
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-blue-800 text-white rounded-lg hover:bg-blue-900 disabled:bg-blue-400 transition-colors inline-flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-700">Confirm Delete</h3>
            </div>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this job? This action cannot be undone.</p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex items-center space-x-3 mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-semibold text-green-700">Success!</h3>
            </div>
            <p className="text-gray-600 mb-6">Job updated successfully!</p>
            <button
              onClick={() => setShowSuccess(false)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ActiveJobs