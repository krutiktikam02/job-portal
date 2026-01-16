"use client"

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Mail, Lock, Eye, EyeOff } from "lucide-react"
import { getProfileCompletion } from "../utils/profileUtils"
import CompletionModal from "./CompletionModal"

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const Login = () => {
  const [userType, setUserType] = useState("job_seeker") // job_seeker or job_poster
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [completionPercent, setCompletionPercent] = useState(0)

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleChange = (e) => {
    const { name, value } = e.target

    setFormData({
      ...formData,
      [name]: value,
    })

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      })
    }

    if (name === "email" && value) {
      if (!validateEmail(value)) {
        setErrors((prev) => ({
          ...prev,
          email: "Please enter a valid email address",
        }))
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const newErrors = {}

    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    // Validate password
    if (!formData.password) {
      newErrors.password = "Password is required"
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters long"
    }

    setErrors(newErrors)

    // Only submit if no errors
    if (Object.keys(newErrors).length === 0) {
      setIsSubmitting(true)
      try {
        // Log request details (avoid logging full password in plaintext)
        const payload = { email: formData.email, userType }
        const passwordMask = `***len:${String(formData.password || "").length}***`
        console.debug("[Login] POST", `${API_BASE_URL}/api/login`, { payload, passwordMask })

        const response = await fetch(`${API_BASE_URL}/api/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...formData, userType }),
        })

        let responseData
        try {
          responseData = await response.json()
        } catch (e) {
          // non-json response
          const text = await response.text()
          responseData = { _raw: text }
        }
        console.debug("[Login] response", { status: response.status, ok: response.ok, data: responseData })

        if (!response.ok) {
          // Handle validation errors from backend
          console.warn("[Login] server returned non-OK status", response.status, responseData)
          if (responseData && responseData.errors) {
            setErrors(responseData.errors)
          } else {
            throw new Error(responseData.error || "Login failed")
          }
          return
        }

        // Store token (e.g., in localStorage for simplicity; use secure storage in production)
        localStorage.setItem("token", responseData.token)

        console.log("Login success:", responseData)
        if (userType === "job_seeker") {
          // After storing token, check profile completion. If new (0%), show modal and route based on user choice.
          try {
            const res = await getProfileCompletion()
            const percent = res?.percent ?? 0
            // If brand new user (0%), immediately route to profile so they can fill it.
            if (percent === 0) {
              navigate("/profile")
            } else {
              // partially complete users see the modal and can choose
              setCompletionPercent(percent)
              setShowCompletionModal(true)
            }
          } catch (err) {
            console.error("Error checking profile completion:", err)
            // fallback to normal behavior
            navigate("/jobs")
          }
        } else {
          // keep previous behavior for job posters
          navigate("/post-job")
        }
      } catch (error) {
        console.error("Login error:", error)
        setErrors((prev) => ({
          ...prev,
          general: error.message || "An error occurred during login",
        }))
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const handleModalClose = () => {
    setShowCompletionModal(false)
    navigate("/jobs")
  }

  const handleCompleteNow = () => {
    setShowCompletionModal(false)
    navigate("/profile")
  }

  const handleContinue = () => {
    setShowCompletionModal(false)
    navigate("/jobs")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-700">Welcome Back</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {userType === "job_seeker"
              ? "Sign in to your account to continue your job search"
              : "Sign in to your account to manage job postings"}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setUserType("job_seeker")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                userType === "job_seeker" ? "bg-white text-blue-800 shadow-sm" : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Job Seekers
            </button>
            <button
              type="button"
              onClick={() => setUserType("job_poster")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                userType === "job_poster" ? "bg-white text-green-800 shadow-sm" : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Job Posters
            </button>
          </div>

          {errors.general && <p className="mt-1 text-sm text-red-600 text-center">{errors.general}</p>}
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 ${
                    userType === "job_seeker" ? "focus:ring-blue-500" : "focus:ring-green-500"
                  } focus:border-transparent ${
                    errors.email ? "border-red-500" : "border-gray-300"
                  } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                  placeholder="Enter your email"
                />
              </div>
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 ${
                    userType === "job_seeker" ? "focus:ring-blue-500" : "focus:ring-green-500"
                  } focus:border-transparent ${
                    errors.password ? "border-red-500" : "border-gray-300"
                  } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
            </div>

            {/* Remember Me & Forgot Password
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className={`h-4 w-4 ${
                    userType === "job_seeker"
                      ? "text-blue-800 focus:ring-blue-500"
                      : "text-green-800 focus:ring-green-500"
                  } border-gray-300 rounded`}
                  disabled={isSubmitting}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className={`font-medium ${
                    userType === "job_seeker"
                      ? "text-blue-800 hover:text-blue-900"
                      : "text-green-800 hover:text-green-900"
                  }`}
                >
                  Forgot your password?
                </Link>
              </div>
            </div> */}

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isSubmitting
                    ? "bg-gray-400 cursor-not-allowed text-white focus:ring-gray-400"
                    : userType === "job_seeker"
                      ? "bg-blue-800 hover:bg-blue-900 text-white focus:ring-blue-500"
                      : "bg-green-800 hover:bg-green-900 text-white focus:ring-green-500"
                }`}
              >
                {isSubmitting ? "Signing In..." : "Sign In"}
              </button>
            </div>

            {/* Sign Up Link */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <Link
                  to="/signup"
                  className={`font-medium ${
                    userType === "job_seeker"
                      ? "text-blue-800 hover:text-blue-900"
                      : "text-green-800 hover:text-green-900"
                  }`}
                >
                  Sign up here
                </Link>
              </p>
            </div>
          </form>
          <CompletionModal
            open={showCompletionModal}
            percent={completionPercent}
            onClose={handleModalClose}
            onCompleteNow={handleCompleteNow}
            onContinue={handleContinue}
          />
        </div>
      </div>
    </div>
  )
}

export default Login