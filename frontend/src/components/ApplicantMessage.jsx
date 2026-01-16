"use client"

import {
  Mail,
  Phone,
  MessageSquare,
  X,
  Check,
  ArrowLeft,
  Briefcase,
  Clock,
  User,
} from "lucide-react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const ApplicantMessage = () => {
  const navigate = useNavigate()
  const [receivedMessages, setReceivedMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState(null)

  const fetchReceivedMessages = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No token found")
      }

      const response = await fetch(`${API_BASE_URL}/api/messages?type=received`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setReceivedMessages(data)
      } else {
        throw new Error("Failed to fetch received messages")
      }
    } catch (err) {
      console.error("Error fetching received messages:", err.message)
      setError("Failed to load messages.")
    } finally {
      setLoading(false)
    }
  }

  const closeSuccessModal = () => {
    setShowSuccess(false)
    setSuccessMessage(null)
  }

  useEffect(() => {
    fetchReceivedMessages()
  }, [])

  if (loading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-800 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading messages...</p>
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
                onClick={() => navigate('/my-jobs')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-700 mb-2">
                  Received Messages
                </h1>
                <p className="text-lg text-gray-600">
                  View messages from job posters regarding your applications
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-100 text-red-700 rounded-lg mb-4">
              {error}
            </div>
          )}
        </div>
      </section>

      {/* Content */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {receivedMessages.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-700 mb-2">No messages received yet</h4>
              <p className="text-gray-600">Apply to jobs to start receiving messages from posters.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {receivedMessages.map((msg) => (
                <div key={msg.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-800 font-medium text-xs">
                            {msg.sender_email?.split('@')[0]?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{msg.sender_email || 'No email'}</p>
                      </div>
                      <p className="text-gray-600 mb-3 whitespace-pre-wrap">{msg.message}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(msg.updated_at || msg.created_at).toLocaleString()}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Success Modal (if needed for future features) */}
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

export default ApplicantMessage