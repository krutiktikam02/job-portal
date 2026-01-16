"use client"

import {
  Users,
  Briefcase,
  Calendar,
  Star,
  TrendingUp,
  Award,
  MapPin,
  Mail,
  Phone,
  CheckCircle,
} from "lucide-react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const HireNumber = () => {
  const navigate = useNavigate()
  const [hiredCandidates, setHiredCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const calculateAgo = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return "Today"
    if (days < 7) return `${days} days ago`
    const weeks = Math.floor(days / 7)
    return `${weeks} week${weeks > 1 ? "s" : ""} ago`
  }

  // Update formatted dates dynamically
  const updateFormattedDates = () => {
    setHiredCandidates(prev =>
      prev.map(candidate => ({
        ...candidate,
        hiredDate: calculateAgo(candidate.hiredTimestamp)
      }))
    )
  }

  useEffect(() => {
    const fetchHiredCandidates = async () => {
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

        let allHired = []
        for (const job of jobs) {
          const applicationsResponse = await fetch(`${API_BASE_URL}/api/applications/${job.id}`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          })

          if (applicationsResponse.ok) {
            const applications = await applicationsResponse.json()
            const hired = applications.filter((app) => app.status === "hired").map((app) => ({
              id: app.id,
              name: app.applicant_name || "Unknown Applicant",
              position: job.job_title || "Unknown Position",
              hiredTimestamp: app.updated_at || app.created_at,
              hiredDate: calculateAgo(app.updated_at || app.created_at),
              email: app.applicant_email || "",
              phone: app.applicant_mobile || "",
              location: app.applicant_location || "",
              avatar:
                app.applicant_name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2) || "NA",
            }))
            allHired = allHired.concat(hired)
          }
        }

        allHired.sort((a, b) => new Date(b.hiredTimestamp) - new Date(a.hiredTimestamp))
        setHiredCandidates(allHired)
        setError(null)
      } catch (err) {
        console.error("Error fetching hired candidates:", err.message)
        setError("Failed to load hired candidates.")
      } finally {
        setLoading(false)
      }
    }

    fetchHiredCandidates()
  }, [])

  // Set up interval to update formatted dates every 60 seconds
  useEffect(() => {
    const interval = setInterval(updateFormattedDates, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-800 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading hired candidates...</p>
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
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-700 mb-2">
                Hired Candidates
              </h1>
              <p className="text-lg text-gray-600">Congratulations on your successful hires! View details of candidates who joined your team.</p>
            </div>
            <button 
              onClick={() => navigate('/poster-dashboard')}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-flex items-center space-x-2"
            >
              <CheckCircle className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}
        </div>
      </section>

      {/* Hired Candidates List */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-800 rounded-lg">
                  <Award className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-700">Recently Hired Talent</h3>
                  <p className="text-gray-600 text-sm">
                    These candidates have been successfully onboarded to your team.
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {hiredCandidates.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-700 mb-2">No hires yet</h4>
                  <p className="text-gray-600">Your team is growing! Hired candidates will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {hiredCandidates.map((candidate) => (
                    <div key={candidate.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-800 font-medium text-sm">{candidate.avatar}</span>
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-700">{candidate.name}</h5>
                          <p className="text-sm text-gray-600">{candidate.position}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                            <span className="flex items-center space-x-1">
                              <Mail className="w-3 h-3" />
                              <span>{candidate.email}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Phone className="w-3 h-3" />
                              <span>{candidate.phone}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-green-600 font-medium">{candidate.hiredDate}</span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          Hired
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default HireNumber