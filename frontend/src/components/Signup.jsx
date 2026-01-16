"use client"

import { useState } from "react"
import { Link } from "react-router-dom"
import { User, Mail, Lock, Phone, Briefcase, Eye, EyeOff, Building2 } from "lucide-react"

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const Signup = () => {
  const [userType, setUserType] = useState("job_seeker") // job_seeker or job_poster
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    mobileNumber: "",
    workStatus: "",
    companyName: "", // Added for job posters
    sendUpdates: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validateMobileNumber = (mobile) => {
    const mobileRegex = /^(\+91)?[6-9]\d{9}$/
    return mobileRegex.test(mobile.replace(/\s+/g, ""))
  }

  const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/
    return passwordRegex.test(password)
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    const newValue = type === "checkbox" ? checked : value

    setFormData({
      ...formData,
      [name]: newValue,
    })

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

    if (name === "mobileNumber" && value) {
      if (!validateMobileNumber(value)) {
        setErrors((prev) => ({
          ...prev,
          mobileNumber: "Please enter a valid 10-digit mobile number",
        }))
      }
    }

    if (name === "password" && value) {
      if (!validatePassword(value)) {
        setErrors((prev) => ({
          ...prev,
          password: "Password must be at least 8 characters with uppercase, lowercase, and number",
        }))
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const newErrors = {}

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required"
    }

    if (!formData.email) {
      newErrors.email = "Email is required"
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (!formData.password) {
      newErrors.password = "Password is required"
    } else if (!validatePassword(formData.password)) {
      newErrors.password = "Password must be at least 8 characters with uppercase, lowercase, and number"
    }

    if (!formData.mobileNumber) {
      newErrors.mobileNumber = "Mobile number is required"
    } else if (!validateMobileNumber(formData.mobileNumber)) {
      newErrors.mobileNumber = "Please enter a valid 10-digit mobile number"
    }

    if (userType === "job_seeker") {
      if (!formData.workStatus) {
        newErrors.workStatus = "Please select your work status"
      }
    } else {
      if (!formData.companyName.trim()) {
        newErrors.companyName = "Company name is required"
      }
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      setIsSubmitting(true)
      try {
        const response = await fetch(`${API_BASE_URL}/api/signup`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...formData, userType }),
        })

        const responseData = await response.json()

        if (!response.ok) {
          // Handle validation errors from backend
          if (responseData.errors) {
            setErrors(responseData.errors)
          } else {
            throw new Error(responseData.error || "Signup failed")
          }
          return
        }

        console.log("Signup success:", responseData)
        // Clear form on success
        setFormData({
          fullName: "",
          email: "",
          password: "",
          mobileNumber: "",
          workStatus: "",
          companyName: "",
          sendUpdates: false,
        })

        alert("Account created successfully! Redirecting to login...")
        if (userType === "job_seeker") {
          window.location.href = "/jobs"
        } else {
          window.location.href = "/posting-job"
        }
      } catch (error) {
        console.error("Signup error:", error)
        setErrors((prev) => ({
          ...prev,
          general: error.message || "An error occurred during signup",
        }))
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-700">Create Your Account</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {userType === "job_seeker"
              ? "Join thousands of professionals and find your dream job"
              : "Join our platform and find the perfect candidates"}
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
            {/* Full Name Input */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 ${
                    userType === "job_seeker" ? "focus:ring-blue-500" : "focus:ring-green-500"
                  } focus:border-transparent ${
                    errors.fullName ? "border-red-500" : "border-gray-300"
                  } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                  placeholder="Enter your full name"
                />
              </div>
              {errors.fullName && <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>}
            </div>

            {userType === "job_poster" && (
              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="companyName"
                    name="companyName"
                    type="text"
                    required
                    value={formData.companyName}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                      errors.companyName ? "border-red-500" : "border-gray-300"
                    } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                    placeholder="Enter your company name"
                  />
                </div>
                {errors.companyName && <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>}
              </div>
            )}

            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
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
                  placeholder="Enter your email address"
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
                  placeholder="Create a strong password"
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

            {/* Mobile Number Input */}
            <div>
              <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Mobile Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="mobileNumber"
                  name="mobileNumber"
                  type="tel"
                  required
                  value={formData.mobileNumber}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 ${
                    userType === "job_seeker" ? "focus:ring-blue-500" : "focus:ring-green-500"
                  } focus:border-transparent ${
                    errors.mobileNumber ? "border-red-500" : "border-gray-300"
                  } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                  placeholder="Enter your mobile number"
                />
              </div>
              {errors.mobileNumber && <p className="mt-1 text-sm text-red-600">{errors.mobileNumber}</p>}
            </div>

            {userType === "job_seeker" && (
              <div>
                <label htmlFor="workStatus" className="block text-sm font-medium text-gray-700 mb-2">
                  Work Status
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select
                    id="workStatus"
                    name="workStatus"
                    required
                    value={formData.workStatus}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white ${
                      errors.workStatus ? "border-red-500" : "border-gray-300"
                    } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <option value="">Select your work status</option>
                    <option value="experienced">Experienced</option>
                    <option value="fresher">Fresher</option>
                  </select>
                </div>
                {errors.workStatus && <p className="mt-1 text-sm text-red-600">{errors.workStatus}</p>}
              </div>
            )}

            {/* Updates Checkbox */}
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="sendUpdates"
                  name="sendUpdates"
                  type="checkbox"
                  checked={formData.sendUpdates}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className={`h-4 w-4 ${
                    userType === "job_seeker"
                      ? "text-blue-800 focus:ring-blue-500"
                      : "text-green-800 focus:ring-green-500"
                  } border-gray-300 rounded disabled:opacity-50`}
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="sendUpdates" className="text-gray-700">
                  Send me important updates via SMS/Email/WhatsApp
                </label>
              </div>
            </div>

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
                {isSubmitting ? "Creating Account..." : "Create Account"}
              </button>
            </div>

            {/* Sign In Link */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className={`font-medium ${
                    userType === "job_seeker"
                      ? "text-blue-800 hover:text-blue-900"
                      : "text-green-800 hover:text-green-900"
                  }`}
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Signup