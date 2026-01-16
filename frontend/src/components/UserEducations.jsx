"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

// API Request Helper Function with Authentication
const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem("token") // Assuming token is stored in localStorage
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
    return await response.json()
  } catch (error) {
    console.error("API request error:", error.message)
    throw error
  }
}

const Education = () => {
  const navigate = useNavigate()
  const [education, setEducation] = useState([])
  const [forms, setForms] = useState([])
  const [editingIndex, setEditingIndex] = useState(null)

  const fetchEducation = async () => {
    try {
      const response = await apiRequest("/api/usereducations", { method: "GET" })
      setEducation(response)
    } catch (error) {
      console.error("Error fetching education:", error.message)
      if (error.message.includes("401") || error.message.includes("403")) {
        navigate("/login") // Redirect to login on auth failure
      }
    }
  }

  useEffect(() => {
    fetchEducation()
  }, [])

  useEffect(() => {
    if (education.length === 0) {
      setForms([{
        degree: "",
        fieldOfStudy: "",
        institution: "",
        courseType: "",
        startYear: "",
        endYear: "",
        cgpa: "",
        courseRequiredPass: false,
      }])
    }
  }, [education])

  const handleInputChange = (formIndex, field, value) => {
    setForms((prev) =>
      prev.map((form, i) =>
        i === formIndex ? { ...form, [field]: value } : form
      )
    )
  }

  const addNewForm = (index = null) => {
    if (index !== null) {
      const edu = education[index]
      setEditingIndex(index)
      setForms([{
        degree: edu.degree || "",
        fieldOfStudy: edu.field_of_study || "",
        institution: edu.institution || "",
        courseType: edu.course_type || "",
        startYear: edu.start_year ? String(edu.start_year) : "",
        endYear: edu.end_year ? String(edu.end_year) : "",
        cgpa: edu.cgpa || "",
        courseRequiredPass: !!edu.course_required_pass,
      }])
    } else {
      setEditingIndex(null)
      setForms((prev) => [
        ...prev,
        {
          degree: "",
          fieldOfStudy: "",
          institution: "",
          courseType: "",
          startYear: "",
          endYear: "",
          cgpa: "",
          courseRequiredPass: false,
        }
      ])
    }
  }

  const removeForm = (formIndex) => {
    setForms((prev) => prev.filter((_, i) => i !== formIndex))
    setEditingIndex(null)
  }

  const saveAllEducation = async () => {
    const errors = []
    forms.forEach((form, index) => {
      if (!form.degree || !form.institution || !form.courseType) {
        errors.push(`Form ${index + 1}: Please fill in all required fields (Degree, Institution, and Course Type).`)
      }
    })

    if (errors.length > 0) {
      alert(errors.join("\n"))
      return
    }

    try {
      if (editingIndex !== null) {
        const form = forms[0]
        const payload = {
          degree: form.degree,
          fieldOfStudy: form.fieldOfStudy || null,
          institution: form.institution,
          courseType: form.courseType,
          startYear: form.startYear ? parseInt(form.startYear) : null,
          endYear: form.endYear ? parseInt(form.endYear) : null,
          cgpa: form.cgpa || null,
          courseRequiredPass: form.courseRequiredPass,
        }
        await apiRequest(`/api/usereducations/${education[editingIndex].id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        })
      } else {
        for (let i = 0; i < forms.length; i++) {
          const form = forms[i]
          const payload = {
            degree: form.degree,
            fieldOfStudy: form.fieldOfStudy || null,
            institution: form.institution,
            courseType: form.courseType,
            startYear: form.startYear ? parseInt(form.startYear) : null,
            endYear: form.endYear ? parseInt(form.endYear) : null,
            cgpa: form.cgpa || null,
            courseRequiredPass: form.courseRequiredPass,
          }
          await apiRequest("/api/usereducations", {
            method: "POST",
            body: JSON.stringify(payload),
          })
        }
      }
      fetchEducation()
      setForms([])
      setEditingIndex(null)
    } catch (error) {
      console.error("Error saving education:", error.message)
      alert(`Error: ${error.message}`)
    }
  }

  const deleteEducation = async (id, index) => {
    const confirmed = window.confirm("Are you sure you want to delete this education record?")
    if (!confirmed) return

    try {
      await apiRequest(`/api/usereducations/${id}`, { method: "DELETE" })
      setEducation(education.filter((_, i) => i !== index))
    } catch (error) {
      console.error("Error deleting education:", error.message)
      alert(`Error: ${error.message}`)
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
              <span className="text-teal-600">Education</span> Management
            </h1>
          </div>
          <button
            onClick={() => addNewForm()}
            className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold"
          >
            Add Education
          </button>
        </div>

        {/* Education List */}
        <div className="grid gap-6">
          {education.map((edu, index) => (
            <div key={edu.id} className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{edu.degree}</h3>
                  {edu.field_of_study && <p className="text-lg text-gray-700 mb-2">{edu.field_of_study}</p>}
                  <p className="text-gray-600 mb-2">{edu.institution}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    {edu.start_year && edu.end_year && (
                      <span>
                        {edu.start_year} - {edu.end_year}
                      </span>
                    )}
                    {edu.cgpa && <span>CGPA: {edu.cgpa}</span>}
                    {edu.course_type && <span>{edu.course_type}</span>}
                    {edu.course_required_pass && <span>Course Required Pass</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => addNewForm(index)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
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
                    onClick={() => deleteEducation(edu.id, index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
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
        </div>

        {/* Education Forms */}
        {forms.length > 0 && (
          <div>
            {forms.map((form, formIndex) => (
              <div key={formIndex} className="mt-8 bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingIndex !== null && formIndex === forms.length - 1 ? "Edit Education" : "Add Education"}
                  </h2>
                  <button onClick={() => removeForm(formIndex)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Degree *</label>
                    <input
                      type="text"
                      value={form.degree}
                      onChange={(e) => handleInputChange(formIndex, "degree", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Bachelor of Science"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Field of Study</label>
                    <input
                      type="text"
                      value={form.fieldOfStudy}
                      onChange={(e) => handleInputChange(formIndex, "fieldOfStudy", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Computer Science"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Institution *</label>
                    <input
                      type="text"
                      value={form.institution}
                      onChange={(e) => handleInputChange(formIndex, "institution", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="University or College name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Course Type *</label>
                    <select
                      value={form.courseType}
                      onChange={(e) => handleInputChange(formIndex, "courseType", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select course type</option>
                      <option value="Full Time">Full Time</option>
                      <option value="Part Time">Part Time</option>
                      <option value="Distance Learning">Distance Learning</option>
                      <option value="Online">Online</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Start Year</label>
                    <input
                      type="text"
                      value={form.startYear}
                      onChange={(e) => handleInputChange(formIndex, "startYear", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 2018"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-left">End Year</label>
                    <input
                      type="text"
                      value={form.endYear}
                      onChange={(e) => handleInputChange(formIndex, "endYear", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 2022"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-left">CGPA / Percentage</label>
                    <input
                      type="text"
                      value={form.cgpa}
                      onChange={(e) => handleInputChange(formIndex, "cgpa", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 8.5 or 80"
                    />
                  </div>
                  <div className="flex items-center space-x-4 md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 text-left">Course Required Pass</label>
                    <input
                      type="checkbox"
                      checked={form.courseRequiredPass}
                      onChange={(e) => handleInputChange(formIndex, "courseRequiredPass", e.target.checked)}
                      className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}
            <div className="mt-6 flex justify-end">
              <button
                onClick={saveAllEducation}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Education
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Education