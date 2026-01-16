"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

// API Request Helper Function with Authentication
const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem("token")
  console.log(`[API Request] ${options.method || "GET"} ${API_BASE_URL}${endpoint}, Token: ${token ? "Present" : "Missing"}`)
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
        ...options.headers,
      },
    })
    console.log(`[API Response] Status: ${response.status}, Content-Type: ${response.headers.get("Content-Type") || "none"}`)
    if (!response.ok) {
      const contentType = response.headers.get("Content-Type") || ""
      let errorMessage = `HTTP error! Status: ${response.status}`
      if (contentType.includes("application/json")) {
        const errorData = await response.json().catch(() => ({}))
        errorMessage = errorData.error || errorMessage
      } else {
        const text = await response.text()
        console.error(`[API Response] Non-JSON response:`, text.slice(0, 100))
        errorMessage = `Unexpected response format (not JSON): ${text.slice(0, 50)}... (Status: ${response.status})`
      }
      throw new Error(errorMessage)
    }
    const contentType = response.headers.get("Content-Type") || ""
    if (!contentType.includes("application/json")) {
      const text = await response.text()
      console.error(`[API Response] Expected JSON, got:`, text.slice(0, 100))
      throw new Error(`Unexpected response format: Server did not return JSON (Status: ${response.status})`)
    }
    const data = await response.json()
    console.log(`[API Success] ${options.method || "GET"} ${endpoint}`, JSON.stringify(data, null, 2))
    return data
  } catch (error) {
    console.error(`[API Error] ${options.method || "GET"} ${endpoint}:`, error.message)
    throw error
  }
}

const Employment = () => {
  const navigate = useNavigate()
  const [employment, setEmployment] = useState([])
  const [editingIndex, setEditingIndex] = useState(null)
  const [employmentForm, setEmploymentForm] = useState({
    companyName: "",
    position: "",
    startDate: "",
    endDate: "",
    isOngoing: false,
    location: "",
    workDescription: "",
    keySkills: [],
  })

  const fetchEmployment = async () => {
    try {
      const response = await apiRequest("/api/useremployments", { method: "GET" })
      if (response) {
        setEmployment(response)
      }
    } catch (error) {
      console.error("[fetchEmployment] Error:", error.message)
      if (error.message.includes("401") || error.message.includes("403")) {
        console.log("[fetchEmployment] Redirecting to /login due to auth failure")
        navigate("/login")
      } else {
        alert(`Error fetching employment: ${error.message}`)
      }
    }
  }

  const handleInputChange = (field, value) => {
    console.log(`[handleInputChange] Updating ${field} to:`, value)
    setEmploymentForm((prev) => ({ ...prev, [field]: value }))
  }

  const addKeySkill = (skill) => {
    if (skill && !employmentForm.keySkills.includes(skill)) {
      setEmploymentForm((prev) => ({
        ...prev,
        keySkills: [...prev.keySkills, skill],
      }))
    }
  }

  const removeKeySkill = (skillToRemove) => {
    setEmploymentForm((prev) => ({
      ...prev,
      keySkills: prev.keySkills.filter((skill) => skill !== skillToRemove),
    }))
  }

  const openForm = (index = null) => {
    if (index !== null) {
      setEditingIndex(index)
      setEmploymentForm({
        companyName: employment[index].companyName || "",
        position: employment[index].position || "",
        startDate: employment[index].startDate || "",
        endDate: employment[index].endDate || "",
        isOngoing: employment[index].isOngoing || false,
        location: employment[index].location || "",
        workDescription: employment[index].workDescription || "",
        keySkills: employment[index].skills ? employment[index].skills.map(skill => skill.name || skill) : [],
      })
    } else {
      setEditingIndex(null)
      setEmploymentForm({
        companyName: "",
        position: "",
        startDate: "",
        endDate: "",
        isOngoing: false,
        location: "",
        workDescription: "",
        keySkills: [],
      })
    }
  }

  const saveEmployment = async () => {
    console.log("[saveEmployment] Starting save process, form:", JSON.stringify(employmentForm, null, 2), "editingIndex:", editingIndex)
    const errors = []
    if (!employmentForm.companyName || employmentForm.companyName.trim() === "") errors.push("Company Name is required")
    if (!employmentForm.position || employmentForm.position.trim() === "") errors.push("Position is required")
    if (!employmentForm.startDate || !/^\d{4}-\d{2}-\d{2}$/.test(employmentForm.startDate)) errors.push("Start Date must be a valid date (YYYY-MM-DD)")
    if (employmentForm.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(employmentForm.endDate)) errors.push("End Date must be a valid date (YYYY-MM-DD)")
    if (employmentForm.endDate && employmentForm.startDate && new Date(employmentForm.endDate) < new Date(employmentForm.startDate)) errors.push("End Date cannot be earlier than Start Date")
    if (employmentForm.isOngoing !== undefined && typeof employmentForm.isOngoing !== "boolean") errors.push("isOngoing must be a boolean")
    if (employmentForm.location && (typeof employmentForm.location !== "string" || employmentForm.location.trim() === "")) errors.push("Location must be a non-empty string")
    if (employmentForm.workDescription && (typeof employmentForm.workDescription !== "string" || employmentForm.workDescription.trim() === "")) errors.push("Work Description must be a non-empty string")
    if (employmentForm.keySkills && (!Array.isArray(employmentForm.keySkills) || employmentForm.keySkills.some(s => typeof s !== "string" || s.trim() === ""))) errors.push("Skills must be an array of non-empty strings")
    if (employmentForm.isOngoing && employmentForm.endDate) errors.push("End Date must be null if isOngoing is true")

    if (errors.length > 0) {
      console.log("[saveEmployment] Validation errors:", errors)
      alert(errors.join("\n"))
      return
    }

    try {
      const payload = {
        companyName: employmentForm.companyName.trim(),
        position: employmentForm.position.trim(),
        startDate: employmentForm.startDate,
        endDate: employmentForm.isOngoing ? null : employmentForm.endDate || null,
        isOngoing: employmentForm.isOngoing || false,
        location: employmentForm.location ? employmentForm.location.trim() : null,
        workDescription: employmentForm.workDescription ? employmentForm.workDescription.trim() : null,
        skills: employmentForm.keySkills.map(s => s.trim()),
      }
      if (editingIndex !== null && employment[editingIndex]?.id) {
        console.log("[saveEmployment] Updating employment ID:", employment[editingIndex].id)
        await apiRequest(`/api/useremployments/${employment[editingIndex].id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        })
      } else {
        console.log("[saveEmployment] Adding new employment")
        await apiRequest("/api/useremployments", {
          method: "POST",
          body: JSON.stringify(payload),
        })
      }
      await fetchEmployment()
      openForm() // Reset form
      alert("Employment saved successfully!")
    } catch (error) {
      console.error("[saveEmployment] Error:", error.message)
      if (error.message.includes("401") || error.message.includes("403")) {
        console.log("[saveEmployment] Redirecting to /login due to auth failure")
        navigate("/login")
      } else if (error.message.includes("404")) {
        alert("Error: Employment not found or server endpoint issue. Please check the server configuration.")
      } else if (error.message.includes("not JSON")) {
        alert("Error: Server returned an unexpected response (HTML instead of JSON). Please check the server configuration or API URL.")
      } else {
        alert(`Error saving employment: ${error.message}`)
      }
    }
  }

  const deleteEmployment = async (id, index) => {
    console.log(`[deleteEmployment] Deleting employment with ID:`, id)
    if (!id || isNaN(id)) {
      console.error("[deleteEmployment] Error: Invalid or missing ID")
      alert("Error: Cannot delete employment. Invalid ID.")
      return
    }
    const confirmed = window.confirm("Are you sure you want to delete this employment?")
    if (!confirmed) {
      console.log("[deleteEmployment] Deletion cancelled by user")
      return
    }

    try {
      await apiRequest(`/api/useremployments/${id}`, { method: "DELETE" })
      console.log(`[deleteEmployment] Successfully deleted employment with ID:`, id)
      setEmployment(employment.filter((_, i) => i !== index))
      alert("Employment deleted successfully!")
    } catch (error) {
      console.error("[deleteEmployment] Error:", error.message)
      if (error.message.includes("404")) {
        alert("Error: Employment not found. It may have already been deleted.")
        await fetchEmployment()
      } else if (error.message.includes("401") || error.message.includes("403")) {
        console.log("[deleteEmployment] Redirecting to /login due to auth failure")
        navigate("/login")
      } else if (error.message.includes("not JSON")) {
        alert("Error: Server returned an unexpected response (HTML instead of JSON). Please check the server configuration or API URL.")
      } else {
        alert(`Error deleting employment: ${error.message}`)
      }
    }
  }

  useEffect(() => {
    fetchEmployment()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto py-8 px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <button onClick={() => navigate("/profile")} className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-4xl font-bold text-gray-900">
              <span className="text-pink-600">Employment</span> Management
            </h1>
          </div>
          <button
            onClick={() => openForm()}
            className="px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-semibold"
          >
            Add Employment
          </button>
        </div>

        {/* Employment List */}
        <div className="grid gap-6 mb-6">
          {employment.map((emp, index) => (
            <div key={emp.id || index} className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{emp.position}</h3>
                  <p className="text-lg text-gray-700 mb-2">{emp.companyName}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
                    <span>
                      {emp.startDate} - {emp.isOngoing ? "Present" : emp.endDate}
                    </span>
                    {emp.location && <span>{emp.location}</span>}
                  </div>
                  {emp.workDescription && <p className="text-gray-600 mb-3">{emp.workDescription}</p>}
                  {emp.skills && emp.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {emp.skills.map((skill, skillIndex) => (
                        <span key={skillIndex} className="px-3 py-1 bg-pink-100 text-pink-800 rounded-full text-sm">
                          {skill.name || skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openForm(index)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                    title="Edit Employment"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => deleteEmployment(emp.id, index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                    title="Delete Employment"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
          {employment.length === 0 && (
            <p className="text-gray-500 text-center w-full py-8">No employment added yet. Add your first employment below!</p>
          )}
        </div>

        {/* Employment Form */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {editingIndex !== null ? "Edit Employment" : "Add Employment"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Company Name *</label>
              <input
                type="text"
                value={employmentForm.companyName}
                onChange={(e) => handleInputChange("companyName", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Company name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Position *</label>
              <input
                type="text"
                value={employmentForm.position}
                onChange={(e) => handleInputChange("position", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Your job title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Location</label>
              <input
                type="text"
                value={employmentForm.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="City, Country"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Start Date *</label>
              <input
                type="date"
                value={employmentForm.startDate}
                onChange={(e) => handleInputChange("startDate", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-4">
              <label className="block text-sm font-medium text-gray-700 text-left">Currently Employed</label>
              <input
                type="checkbox"
                checked={employmentForm.isOngoing}
                onChange={(e) => handleInputChange("isOngoing", e.target.checked)}
                className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>
            {!employmentForm.isOngoing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-left">End Date</label>
                <input
                  type="date"
                  value={employmentForm.endDate}
                  onChange={(e) => handleInputChange("endDate", e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Work Description</label>
              <textarea
                value={employmentForm.workDescription}
                onChange={(e) => handleInputChange("workDescription", e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe your responsibilities and achievements..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Key Skills Used</label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Add skill"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      addKeySkill(e.target.value.trim())
                      e.target.value = ""
                    }
                  }}
                />
                <button
                  onClick={(e) => {
                    const input = e.target.previousElementSibling
                    addKeySkill(input.value.trim())
                    input.value = ""
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {employmentForm.keySkills.map((skill, skillIndex) => (
                  <span
                    key={skillIndex}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm"
                  >
                    {skill}
                    <button
                      onClick={() => removeKeySkill(skill)}
                      className="hover:bg-indigo-200 rounded-full p-1 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-4">
            <button
              onClick={() => openForm()}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear Form
            </button>
            <button
              onClick={saveEmployment}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Employment
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Employment