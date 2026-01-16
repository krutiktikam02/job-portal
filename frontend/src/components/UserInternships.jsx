"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

// API Request Helper Function with Authentication
const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem("token")
  console.log(`[API Request] ${options.method || "GET"} ${endpoint}, Token: ${token ? "Present" : "Missing"}`)
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
        ...options.headers,
      },
    })
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `HTTP error! Status: ${response.status}`)
    }
    const data = await response.json()
    console.log(`[API Success] ${options.method || "GET"} ${endpoint}`, data)
    return data
  } catch (error) {
    console.error(`[API Error] ${options.method || "GET"} ${endpoint}:`, error.message)
    throw error
  }
}

const Internships = () => {
  const navigate = useNavigate()
  const [internships, setInternships] = useState([])
  const [form, setForm] = useState({
    company: "",
    role: "",
    startDate: "",
    endDate: "",
    location: "",
    description: "",
    projectName: "",
  })
  const [editingId, setEditingId] = useState(null)

  const fetchInternships = async () => {
    try {
      console.log("[fetchInternships] Fetching internships...")
      const response = await apiRequest("/api/userinternships", { method: "GET" })
      console.log("[fetchInternships] Raw response:", response)
      // Ensure id is a number and filter out invalid entries
      const normalizedInternships = response
        .filter(item => item.id && !isNaN(item.id))
        .map(item => ({ ...item, id: item.id }))
      console.log("[fetchInternships] Normalized data:", normalizedInternships)
      setInternships(normalizedInternships)
    } catch (error) {
      console.error("[fetchInternships] Error:", error.message)
      if (error.message.includes("401") || error.message.includes("403")) {
        console.log("[fetchInternships] Redirecting to /login due to auth failure")
        navigate("/login")
      } else {
        alert(`Error fetching internships: ${error.message}`)
      }
    }
  }

  useEffect(() => {
    fetchInternships()
  }, [])

  const handleInputChange = (field, value) => {
    console.log(`[handleInputChange] Updating ${field} to:`, value)
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const addNewForm = (internship = null) => {
    console.log("[addNewForm] Adding form, Editing:", !!internship, internship)
    if (internship) {
      const id = internship.id
      if (!id || isNaN(id)) {
        console.error("[addNewForm] Error: Invalid or missing ID", internship)
        alert("Error: Cannot edit internship. Invalid ID.")
        return
      }
      console.log("[addNewForm] Setting editingId to:", id)
      setEditingId(id)
      setForm({
        company: internship.company || "",
        role: internship.role || "",
        projectName: internship.project_name || "",
        location: internship.location || "",
        startDate: internship.start_date || "",
        endDate: internship.end_date || "",
        description: internship.description || "",
      })
    } else {
      setEditingId(null)
      setForm({
        company: "",
        role: "",
        startDate: "",
        endDate: "",
        location: "",
        description: "",
        projectName: "",
      })
    }
  }

  const saveInternship = async () => {
    console.log("[saveInternship] Starting save process, form:", form, "editingId:", editingId)
    const errors = []
    if (!form.company || form.company.trim() === "") errors.push("Company is required")
    if (!form.role || form.role.trim() === "") errors.push("Role is required")
    if (!form.startDate || !/^\d{4}-\d{2}-\d{2}$/.test(form.startDate)) errors.push("Start Date must be a valid date (YYYY-MM-DD)")
    if (form.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(form.endDate)) errors.push("End Date must be a valid date (YYYY-MM-DD)")
    if (form.endDate && form.startDate && new Date(form.endDate) < new Date(form.startDate)) errors.push("End Date cannot be earlier than Start Date")
    if (form.projectName && (typeof form.projectName !== "string" || form.projectName.trim() === "")) errors.push("Project Name must be a non-empty string")
    if (form.location && (typeof form.location !== "string" || form.location.trim() === "")) errors.push("Location must be a non-empty string")
    if (form.description && (typeof form.description !== "string" || form.description.trim() === "")) errors.push("Description must be a non-empty string")

    if (errors.length > 0) {
      console.log("[saveInternship] Validation errors:", errors)
      alert(errors.join("\n"))
      return
    }

    try {
      const payload = {
        company: form.company.trim(),
        role: form.role.trim(),
        projectName: form.projectName ? form.projectName.trim() : null,
        location: form.location ? form.location.trim() : null,
        startDate: form.startDate,
        endDate: form.endDate || null,
        description: form.description ? form.description.trim() : null,
      }
      console.log("[saveInternship] Payload:", payload)
      if (editingId && !isNaN(editingId)) {
        console.log("[saveInternship] Updating internship ID:", editingId)
        await apiRequest(`/api/userinternships/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        })
      } else {
        console.log("[saveInternship] Adding new internship")
        await apiRequest("/api/userinternships", {
          method: "POST",
          body: JSON.stringify(payload),
        })
      }
      console.log("[saveInternship] Save successful, refetching data...")
      await fetchInternships()
      setForm({
        company: "",
        role: "",
        startDate: "",
        endDate: "",
        location: "",
        description: "",
        projectName: "",
      })
      setEditingId(null)
      alert("Internship saved successfully!")
    } catch (error) {
      console.error("[saveInternship] Error:", error.message)
      if (error.message.includes("401") || error.message.includes("403")) {
        console.log("[saveInternship] Redirecting to /login due to auth failure")
        navigate("/login")
      } else {
        alert(`Error saving internship: ${error.message}`)
      }
    }
  }

  const deleteInternship = async (id, index) => {
    console.log(`[deleteInternship] Deleting internship with ID:`, id)
    if (!id || isNaN(id)) {
      console.error("[deleteInternship] Error: Invalid or missing ID")
      alert("Error: Cannot delete internship. Invalid ID.")
      return
    }
    const confirmed = window.confirm("Are you sure you want to delete this internship?")
    if (!confirmed) {
      console.log("[deleteInternship] Deletion cancelled by user")
      return
    }

    try {
      await apiRequest(`/api/userinternships/${id}`, { method: "DELETE" })
      console.log(`[deleteInternship] Successfully deleted internship with ID:`, id)
      setInternships((prev) => prev.filter((_, i) => i !== index))
      alert("Internship deleted successfully!")
    } catch (error) {
      console.error("[deleteInternship] Error:", error.message)
      if (error.message.includes("404")) {
        alert("Error: Internship not found. It may have already been deleted.")
      } else if (error.message.includes("401") || error.message.includes("403")) {
        console.log("[deleteInternship] Redirecting to /login due to auth failure")
        navigate("/login")
      } else {
        alert(`Error deleting internship: ${error.message}`)
      }
    }
  }

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
              <span className="text-red-600">Internships</span> Management
            </h1>
          </div>
          <button
            onClick={() => addNewForm()}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
          >
            Add Internship
          </button>
        </div>

        {/* Internships List */}
        <div className="grid gap-6 mb-6">
          {internships.length === 0 ? (
            <p className="text-gray-500 text-center w-full py-8">No internships added yet. Add your first internship below!</p>
          ) : (
            internships.map((internship, index) => (
              <div key={`internship-${internship.id || index}`} className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{internship.role}</h3>
                    <p className="text-lg text-gray-700 mb-2">{internship.company}</p>
                    {internship.project_name && <p className="text-gray-600 mb-2">Project: {internship.project_name}</p>}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3 justify-center">
                      <span>
                        {new Date(internship.start_date).toLocaleDateString()} - {internship.end_date ? new Date(internship.end_date).toLocaleDateString() : "Present"}
                      </span>
                      {internship.location && <p>{internship.location}</p>}
                    </div>
                    {internship.description && <p className="text-gray-600">{internship.description}</p>}
                    <p className="text-sm text-gray-500 mt-2 text-center">Added on: {new Date(internship.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => addNewForm(internship)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                      title="Edit Internship"
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
                      onClick={() => deleteInternship(internship.id, index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      title="Delete Internship"
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
            ))
          )}
        </div>

        {/* Internship Form */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {editingId && !isNaN(editingId) ? "Edit Internship" : "Add Internship"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company *</label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => handleInputChange("company", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Company name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
              <input
                type="text"
                value={form.role}
                onChange={(e) => handleInputChange("role", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Your role"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Project Name</label>
              <input
                type="text"
                value={form.projectName}
                onChange={(e) => handleInputChange("projectName", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Project name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="City, Country"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => handleInputChange("startDate", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => handleInputChange("endDate", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe your internship experience..."
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-4">
            <button
              onClick={() => addNewForm()}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear Form
            </button>
            <button
              onClick={saveInternship}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Internship
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Internships