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

const Languages = () => {
  const navigate = useNavigate()
  const [languages, setLanguages] = useState([])
  const [forms, setForms] = useState([])
  const [editingLanguage, setEditingLanguage] = useState(null)

  const fetchLanguages = async () => {
    try {
      const response = await apiRequest("/api/userlanguages", { method: "GET" })
      setLanguages(response)
    } catch (error) {
      console.error("Error fetching languages:", error.message)
      if (error.message.includes("401") || error.message.includes("403")) {
        navigate("/login") // Redirect to login on auth failure
      }
    }
  }

  useEffect(() => {
    fetchLanguages()
  }, [])

  useEffect(() => {
    if (languages.length === 0) {
      setForms([{ languageName: "", proficiency: "Beginner" }])
    }
  }, [languages])

  const handleInputChange = (formIndex, field, value) => {
    setForms((prev) =>
      prev.map((form, i) =>
        i === formIndex ? { ...form, [field]: value } : form
      )
    )
  }

  const addNewForm = (language = null) => {
    if (language !== null) {
      setEditingLanguage(language.language_name)
      setForms([{ languageName: language.language_name, proficiency: language.proficiency }])
    } else {
      setEditingLanguage(null)
      setForms((prev) => [...prev, { languageName: "", proficiency: "Beginner" }])
    }
  }

  const removeForm = (formIndex) => {
    setForms((prev) => prev.filter((_, i) => i !== formIndex))
    setEditingLanguage(null)
  }

  const saveAllLanguages = async () => {
    const errors = []
    forms.forEach((form, index) => {
      if (!form.languageName || form.languageName.trim() === "") {
        errors.push(`Form ${index + 1}: Please fill in the language name.`)
      }
      if (!form.proficiency || !['Beginner', 'Intermediate', 'Advanced', 'Native'].includes(form.proficiency)) {
        errors.push(`Form ${index + 1}: Please select a valid proficiency level.`)
      }
    })

    if (errors.length > 0) {
      alert(errors.join("\n"))
      return
    }

    try {
      if (editingLanguage !== null) {
        const form = forms[0]
        await apiRequest(`/api/userlanguages/${editingLanguage}`, { method: "DELETE" })
        await apiRequest("/api/userlanguages", {
          method: "POST",
          body: JSON.stringify({ languageName: form.languageName.trim(), proficiency: form.proficiency }),
        })
      } else {
        for (let i = 0; i < forms.length; i++) {
          const form = forms[i]
          await apiRequest("/api/userlanguages", {
            method: "POST",
            body: JSON.stringify({ languageName: form.languageName.trim(), proficiency: form.proficiency }),
          })
        }
      }
      fetchLanguages()
      setForms([])
      setEditingLanguage(null)
    } catch (error) {
      console.error("Error saving languages:", error.message)
      if (error.message.includes("Language already exists")) {
        alert("Error: One or more languages already exist.")
      } else {
        alert(`Error: ${error.message}`)
      }
    }
  }

  const updateLanguageProficiency = async (languageName, proficiency) => {
    try {
      await apiRequest(`/api/userlanguages/${languageName}`, { method: "DELETE" })
      await apiRequest("/api/userlanguages", {
        method: "POST",
        body: JSON.stringify({ languageName: languageName.trim(), proficiency }),
      })
      setLanguages(languages.map((lang) =>
        lang.language_name === languageName ? { ...lang, proficiency } : lang
      ))
    } catch (error) {
      console.error("Error updating language proficiency:", error.message)
      alert(`Error: ${error.message}`)
    }
  }

  const deleteLanguage = async (languageName) => {
    const confirmed = window.confirm("Are you sure you want to delete this language?")
    if (!confirmed) return

    try {
      await apiRequest(`/api/userlanguages/${languageName}`, { method: "DELETE" })
      setLanguages(languages.filter((lang) => lang.language_name !== languageName))
    } catch (error) {
      console.error("Error deleting language:", error.message)
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
              <span className="text-teal-600">Languages</span> Management
            </h1>
          </div>
          <button
            onClick={() => addNewForm()}
            className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold"
          >
            Add Language
          </button>
        </div>

        {/* Languages List */}
        <div className="grid gap-6">
          {languages.map((language) => (
            <div key={language.language_name} className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{language.language_name}</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">Proficiency:</span>
                    <select
                      value={language.proficiency}
                      onChange={(e) => updateLanguageProficiency(language.language_name, e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                      <option value="Native">Native</option>
                    </select>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Added on: {new Date(language.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => addNewForm(language)}
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
                    onClick={() => deleteLanguage(language.language_name)}
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
          {languages.length === 0 && (
            <p className="text-gray-500 text-center w-full py-8">
              No languages added yet. Add your first language above!
            </p>
          )}
        </div>

        {/* Language Forms */}
        {forms.length > 0 && (
          <div>
            {forms.map((form, formIndex) => (
              <div key={formIndex} className="mt-8 bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingLanguage !== null && formIndex === forms.length - 1 ? "Edit Language" : "Add Language"}
                  </h2>
                  <button onClick={() => removeForm(formIndex)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Language Name *</label>
                    <input
                      type="text"
                      value={form.languageName}
                      onChange={(e) => handleInputChange(formIndex, "languageName", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Spanish"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Proficiency *</label>
                    <select
                      value={form.proficiency}
                      onChange={(e) => handleInputChange(formIndex, "proficiency", e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                      <option value="Native">Native</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
            <div className="mt-6 flex justify-end">
              <button
                onClick={saveAllLanguages}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Languages
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Languages