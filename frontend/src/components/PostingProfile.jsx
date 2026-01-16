"use client"

import {
  Building2,
  MapPin,
  Mail,
  Phone,
  Globe,
  Users,
  Briefcase,
  Calendar,
  Edit3,
  Save,
  X,
  Camera,
  Star,
  Award,
  TrendingUp,
  Clock,
  Link,
} from "lucide-react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const PostingProfile = () => {
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [profileData, setProfileData] = useState({
    companyName: "TechCorp Solutions",
    industry: "Technology",
    location: "San Francisco, CA",
    email: "hr@techcorp.com",
    phone: "+1 (555) 123-4567",
    website: "www.techcorp.com",
    description:
      "Leading technology company specializing in innovative software solutions. We're passionate about creating products that make a difference in people's lives.",
    employees: "500-1000",
    founded: "2015",
  })
  const [originalData, setOriginalData] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [activeJobs, setActiveJobs] = useState(0)
  const [totalApplicants, setTotalApplicants] = useState(0)
  const [interviewsScheduled, setInterviewsScheduled] = useState(0)
  const [hireRate, setHireRate] = useState(0)

  // Fetch profile data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token")
        console.log("Fetching profile with token:", token ? "Present" : "Missing")
        const response = await fetch(`${API_BASE_URL}/api/postingprofile`, { // Updated URL
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        console.log("Fetch response status:", response.status)
        console.log("Fetch response headers:", [...response.headers.entries()])

        if (!response.ok) {
          const errorText = await response.text()
          console.error("Error response text:", errorText)
          const errorData = await response.json().catch(() => ({ error: "Non-JSON response" }))
          throw new Error(errorData.error || `Failed to fetch profile (status: ${response.status})`)
        }

        const data = await response.json()
        console.log("Fetched data:", data)
        setProfileData({
          companyName: data.company_name,
          industry: data.industry,
          location: data.location,
          email: data.email,
          phone: data.phone,
          website: data.website,
          description: data.description,
          employees: data.employees || "",
          founded: data.founded || "",
        })
        setOriginalData({
          companyName: data.company_name,
          industry: data.industry,
          location: data.location,
          email: data.email,
          phone: data.phone,
          website: data.website,
          description: data.description,
          employees: data.employees || "",
          founded: data.founded || "",
        })
        setError(null)
      } catch (err) {
        console.error("Error fetching profile:", err.message)
        setError("Failed to load profile. Using default data.")
      }
    }

    fetchProfile()
  }, [])

  // Fetch active jobs and total applicants, poll every 10 seconds for real-time updates
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const token = localStorage.getItem("token")
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

        const jobsData = await response.json()
        // Assuming data is an array of jobs posted by the user, and all are considered active
        setActiveJobs(jobsData.length)

        // Fetch applications for each job
        const applicationsPromises = jobsData.map((job) =>
          fetch(`${API_BASE_URL}/api/applications/${job.id}`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }).then((res) => (res.ok ? res.json() : [])).catch(() => [])
        )

        const applicationsResults = await Promise.all(applicationsPromises)
        const total = applicationsResults.reduce((sum, apps) => sum + apps.length, 0)
        setTotalApplicants(total)

        let interviewCount = 0
        let hiredCount = 0
        applicationsResults.forEach(apps => {
          if (Array.isArray(apps)) {
            apps.forEach(app => {
              if (app.status === 'interview') {
                interviewCount++
              }
              if (app.status === 'hired') {
                hiredCount++
              }
            })
          }
        })
        setInterviewsScheduled(interviewCount)
        setHireRate(hiredCount)
      } catch (err) {
        console.error("Error fetching jobs:", err.message)
      }
    }

    fetchJobs()
    const interval = setInterval(fetchJobs, 10000) // Poll every 10 seconds

    return () => clearInterval(interval)
  }, [])

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_BASE_URL}/api/postingprofile`, { // Updated URL
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyName: profileData.companyName,
          industry: profileData.industry,
          location: profileData.location,
          email: profileData.email,
          phone: profileData.phone,
          website: profileData.website,
          description: profileData.description,
          employees: profileData.employees,
          founded: profileData.founded,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update profile")
      }

      setOriginalData({ ...profileData })
      setIsEditing(false)
      setSuccess("Profile updated successfully")
      setError(null)
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      console.error("Error updating profile:", err.message)
      setError(err.message)
    }
  }

  const handleCancel = () => {
    setProfileData({ ...originalData })
    setIsEditing(false)
    setError(null)
    setSuccess(null)
  }

  const stats = [
    { icon: <Briefcase className="w-6 h-6 text-blue-800" />, label: "Active Jobs", value: activeJobs.toString(), link: "/active-jobs" },
    { icon: <Users className="w-6 h-6 text-blue-800" />, label: "Total Applicants", value: totalApplicants.toString(), link: "/applicants" },
    { icon: <Star className="w-6 h-6 text-blue-800" />, label: "Interviews Scheduled", value: interviewsScheduled.toString(), link: "/schedule-interview" },
    { icon: <TrendingUp className="w-6 h-6 text-blue-800" />, label: "Hire Number", value: hireRate.toString(), link: "/hire-number" },
  ]

  return (
    <div className="bg-white min-h-screen">
      {/* Header Section */}
      <section className="bg-gradient-to-br from-blue-50 to-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-start gap-8">
            {/* Company Logo/Avatar */}
            <div className="relative">
              <div className="w-32 h-32 bg-blue-800 rounded-lg flex items-center justify-center">
                <Building2 className="w-16 h-16 text-white" />
              </div>
              <button className="absolute -bottom-2 -right-2 bg-white p-2 rounded-full shadow-md border border-gray-200 hover:bg-gray-50">
                <Camera className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Company Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-700 mb-2">{profileData.companyName}</h1>
                  <p className="text-lg text-gray-600 mb-4">{profileData.industry}</p>
                </div>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg font-semibold transition-colors inline-flex items-center space-x-2"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>{isEditing ? "Cancel" : "Edit Profile"}</span>
                </button>
              </div>

              <p className="text-gray-600 text-pretty mb-6">{profileData.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Globe className="w-4 h-4" />
                  <span>{profileData.website}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span>{profileData.email}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{profileData.phone}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{profileData.location}</span>
                </div>
              </div>

              {/* Error and Success Messages */}
              {error && (
                <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg">
                  {error}
                </div>
              )}
              {success && (
                <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-lg">
                  {success}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div
                key={index}
                onClick={stat.link ? () => navigate(stat.link) : undefined}
                className={`text-center p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer ${
                  stat.link ? "hover:bg-blue-50" : ""
                }`}
              >
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-blue-50 rounded-lg">{stat.icon}</div>
                </div>
                <h3 className="text-2xl font-bold text-gray-700 mb-1">{stat.value}</h3>
                <p className="text-gray-600 text-sm">{stat.label}</p>
                {stat.link && <Link className="w-4 h-4 text-blue-600 mt-2 mx-auto" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Company Details & Editable Fields (shown only when editing) */}
      {isEditing && (
        <section className="py-12 bg-blue-50">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Company Details */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-700 mb-6">Company Details</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                    <input
                      type="text"
                      value={profileData.companyName}
                      onChange={(e) => setProfileData({ ...profileData, companyName: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                    <input
                      type="text"
                      value={profileData.industry}
                      onChange={(e) => setProfileData({ ...profileData, industry: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={profileData.description}
                      onChange={(e) => setProfileData({ ...profileData, description: e.target.value })}
                      rows={4}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Editable Fields (Phone, Website, Description) */}
              <div className="bg-white rounded-lg p-6 border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-700 mb-6">Additional Details</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                    <input
                      type="url"
                      value={profileData.website}
                      onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input
                      type="text"
                      value={profileData.location}
                      onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleSave}
                      className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg font-semibold transition-colors inline-flex items-center space-x-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save</span>
                    </button>
                    <button
                      onClick={handleCancel}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors inline-flex items-center space-x-2"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

export default PostingProfile