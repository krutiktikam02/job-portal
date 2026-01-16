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

const Accomplishments = () => {
  const navigate = useNavigate()
  const [savedAccomplishments, setSavedAccomplishments] = useState({
    certifications: [],
    awards: [],
    clubs: [],
  })
  const [forms, setForms] = useState({
    certifications: [],
    awards: [],
    clubs: [],
  })
  const [editingId, setEditingId] = useState({
    certifications: null,
    awards: null,
    clubs: null,
  })

  const fetchAccomplishments = async () => {
    try {
      console.log("[fetchAccomplishments] Fetching accomplishments...")
      const response = await apiRequest("/api/useraccomplishments", { method: "GET" })
      console.log("[fetchAccomplishments] Raw response:", response)
      // Map id (MySQL) to id for consistency, filter out invalid entries
      const normalizedResponse = {
        certifications: response.certifications
          .filter(item => item.id && !isNaN(item.id))
          .map(item => ({ ...item, id: item.id })),
        awards: response.awards
          .filter(item => item.id && !isNaN(item.id))
          .map(item => ({ ...item, id: item.id })),
        clubs: response.clubs
          .filter(item => item.id && !isNaN(item.id))
          .map(item => ({ ...item, id: item.id })),
      }
      console.log("[fetchAccomplishments] Normalized data:", normalizedResponse)
      setSavedAccomplishments(normalizedResponse)
    } catch (error) {
      console.error("[fetchAccomplishments] Error:", error.message)
      if (error.message.includes("401") || error.message.includes("403")) {
        console.log("[fetchAccomplishments] Redirecting to /login due to auth failure")
        navigate("/login")
      } else {
        alert(`Error fetching accomplishments: ${error.message}`)
      }
    }
  }

  useEffect(() => {
    fetchAccomplishments()
  }, [])

  useEffect(() => {
    console.log("[useEffect] Updating forms based on savedAccomplishments:", savedAccomplishments)
    const newForms = { certifications: [], awards: [], clubs: [] }
    if (savedAccomplishments.certifications.length === 0) {
      newForms.certifications.push({ name: "", issuer: "", year: "" })
    }
    if (savedAccomplishments.awards.length === 0) {
      newForms.awards.push({ title: "", issuer: "", year: "" })
    }
    if (savedAccomplishments.clubs.length === 0) {
      newForms.clubs.push({ name: "", role: "", year: "" })
    }
    setForms(newForms)
  }, [savedAccomplishments])

  const handleInputChange = (category, formIndex, field, value) => {
    console.log(`[handleInputChange] Updating ${category}[${formIndex}].${field} to:`, value)
    setForms((prev) => ({
      ...prev,
      [category]: prev[category].map((form, i) =>
        i === formIndex ? { ...form, [field]: value } : form
      ),
    }))
  }

  const addNewForm = (category, accomplishment = null) => {
    console.log(`[addNewForm] Adding form for ${category}, Editing:`, !!accomplishment, accomplishment)
    if (accomplishment) {
      const id = accomplishment.id
      if (!id || isNaN(id)) {
        console.error(`[addNewForm] Error: Invalid or missing ID for ${category}`, accomplishment)
        alert(`Error: Cannot edit ${category.slice(0, -1)}. Invalid ID.`)
        return
      }
      console.log(`[addNewForm] Setting editingId for ${category} to:`, id)
      setEditingId((prev) => ({ ...prev, [category]: id }))
      setForms((prev) => ({
        ...prev,
        [category]: [
          {
            ...(category === "awards"
              ? { title: accomplishment.name || "", issuer: accomplishment.issuer || "", year: accomplishment.year || "" }
              : category === "clubs"
              ? { name: accomplishment.name || "", role: accomplishment.role || "", year: accomplishment.year || "" }
              : { name: accomplishment.name || "", issuer: accomplishment.issuer || "", year: accomplishment.year || "" }),
          },
        ],
      }))
    } else {
      setEditingId((prev) => ({ ...prev, [category]: null }))
      setForms((prev) => ({
        ...prev,
        [category]: [
          ...prev[category],
          category === "awards"
            ? { title: "", issuer: "", year: "" }
            : category === "clubs"
            ? { name: "", role: "", year: "" }
            : { name: "", issuer: "", year: "" },
        ],
      }))
    }
  }

  const removeForm = (category, formIndex) => {
    console.log(`[removeForm] Removing form from ${category} at index:`, formIndex)
    setForms((prev) => ({
      ...prev,
      [category]: prev[category].filter((_, i) => i !== formIndex),
    }))
    setEditingId((prev) => ({ ...prev, [category]: null }))
  }

  const saveAllAccomplishments = async () => {
    console.log("[saveAllAccomplishments] Starting save process, forms:", forms, "editingId:", editingId)
    const errors = []
    forms.certifications.forEach((form, index) => {
      if (!form.name || form.name.trim() === "") errors.push(`Certification ${index + 1}: Name is required.`)
      if (!form.issuer || form.issuer.trim() === "") errors.push(`Certification ${index + 1}: Issuer is required.`)
      if (form.year && (isNaN(form.year) || form.year < 1900 || form.year > new Date().getFullYear())) {
        errors.push(`Certification ${index + 1}: Year must be between 1900 and ${new Date().getFullYear()}.`)
      }
    })
    forms.awards.forEach((form, index) => {
      if (!form.title || form.title.trim() === "") errors.push(`Award ${index + 1}: Title is required.`)
      if (!form.issuer || form.issuer.trim() === "") errors.push(`Award ${index + 1}: Issuer is required.`)
      if (form.year && (isNaN(form.year) || form.year < 1900 || form.year > new Date().getFullYear())) {
        errors.push(`Award ${index + 1}: Year must be between 1900 and ${new Date().getFullYear()}.`)
      }
    })
    forms.clubs.forEach((form, index) => {
      if (!form.name || form.name.trim() === "") errors.push(`Club/Committee ${index + 1}: Name is required.`)
      if (form.year && (isNaN(form.year) || form.year < 1900 || form.year > new Date().getFullYear())) {
        errors.push(`Club/Committee ${index + 1}: Year must be between 1900 and ${new Date().getFullYear()}.`)
      }
    })

    if (errors.length > 0) {
      console.log("[saveAllAccomplishments] Validation errors:", errors)
      alert(errors.join("\n"))
      return
    }

    try {
      // Certifications
      for (let form of forms.certifications) {
        console.log("[saveAllAccomplishments] Processing certification:", form, "editingId.certifications:", editingId.certifications)
        if (editingId.certifications && !isNaN(editingId.certifications)) {
          console.log("[saveAllAccomplishments] Updating certification ID:", editingId.certifications)
          await apiRequest(`/api/useraccomplishments/certifications/${editingId.certifications}`, {
            method: "PUT",
            body: JSON.stringify({ name: form.name.trim(), issuer: form.issuer.trim(), year: form.year ? parseInt(form.year) : null }),
          })
        } else {
          console.log("[saveAllAccomplishments] Adding new certification:", form)
          await apiRequest("/api/useraccomplishments/certifications", {
            method: "POST",
            body: JSON.stringify({ name: form.name.trim(), issuer: form.issuer.trim(), year: form.year ? parseInt(form.year) : null }),
          })
        }
      }

      // Awards
      for (let form of forms.awards) {
        console.log("[saveAllAccomplishments] Processing award:", form, "editingId.awards:", editingId.awards)
        if (editingId.awards && !isNaN(editingId.awards)) {
          console.log("[saveAllAccomplishments] Updating award ID:", editingId.awards)
          await apiRequest(`/api/useraccomplishments/awards/${editingId.awards}`, {
            method: "PUT",
            body: JSON.stringify({ title: form.title.trim(), issuer: form.issuer.trim(), year: form.year ? parseInt(form.year) : null }),
          })
        } else {
          console.log("[saveAllAccomplishments] Adding new award:", form)
          await apiRequest("/api/useraccomplishments/awards", {
            method: "POST",
            body: JSON.stringify({ title: form.title.trim(), issuer: form.issuer.trim(), year: form.year ? parseInt(form.year) : null }),
          })
        }
      }

      // Clubs
      for (let form of forms.clubs) {
        console.log("[saveAllAccomplishments] Processing club:", form, "editingId.clubs:", editingId.clubs)
        if (editingId.clubs && !isNaN(editingId.clubs)) {
          console.log("[saveAllAccomplishments] Updating club ID:", editingId.clubs)
          await apiRequest(`/api/useraccomplishments/clubs/${editingId.clubs}`, {
            method: "PUT",
            body: JSON.stringify({ name: form.name.trim(), role: form.role ? form.role.trim() : null, year: form.year ? parseInt(form.year) : null }),
          })
        } else {
          console.log("[saveAllAccomplishments] Adding new club:", form)
          await apiRequest("/api/useraccomplishments/clubs", {
            method: "POST",
            body: JSON.stringify({ name: form.name.trim(), role: form.role ? form.role.trim() : null, year: form.year ? parseInt(form.year) : null }),
          })
        }
      }

      console.log("[saveAllAccomplishments] All requests completed, refetching data...")
      await fetchAccomplishments()
      setForms({ certifications: [], awards: [], clubs: [] })
      setEditingId({ certifications: null, awards: null, clubs: null })
      alert("Accomplishments saved successfully!")
    } catch (error) {
      console.error("[saveAllAccomplishments] Error:", error.message)
      if (error.message.includes("User profile not found")) {
        alert("Error: User profile not found. Please ensure you are logged in.")
      } else if (error.message.includes("401") || error.message.includes("403")) {
        console.log("[saveAllAccomplishments] Redirecting to /login due to auth failure")
        navigate("/login")
      } else {
        alert(`Error saving accomplishments: ${error.message}`)
      }
    }
  }

  const deleteAccomplishment = async (category, id) => {
    console.log(`[deleteAccomplishment] Deleting ${category} with ID:`, id)
    if (!id || isNaN(id)) {
      console.error(`[deleteAccomplishment] Error: Invalid or missing ID for ${category}`)
      alert(`Error: Cannot delete ${category.slice(0, -1)}. Invalid ID.`)
      return
    }
    const confirmed = window.confirm(`Are you sure you want to delete this ${category.slice(0, -1)}?`)
    if (!confirmed) {
      console.log("[deleteAccomplishment] Deletion cancelled by user")
      return
    }

    try {
      await apiRequest(`/api/useraccomplishments/${category}/${id}`, { method: "DELETE" })
      console.log(`[deleteAccomplishment] Successfully deleted ${category} with ID:`, id)
      setSavedAccomplishments((prev) => ({
        ...prev,
        [category]: prev[category].filter((item) => item.id !== id),
      }))
      alert(`${category.slice(0, -1)} deleted successfully!`)
    } catch (error) {
      console.error(`[deleteAccomplishment] Error deleting ${category.slice(0, -1)}:`, error.message)
      if (error.message.includes("404")) {
        alert(`Error: ${category.slice(0, -1)} not found. It may have already been deleted.`)
      } else if (error.message.includes("401") || error.message.includes("403")) {
        console.log("[deleteAccomplishment] Redirecting to /login due to auth failure")
        navigate("/login")
      } else {
        alert(`Error deleting ${category.slice(0, -1)}: ${error.message}`)
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
              <span className="text-teal-600">Accomplishments</span> Management
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => addNewForm("certifications")}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm"
            >
              Add Certification
            </button>
            <button
              onClick={() => addNewForm("awards")}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm"
            >
              Add Award
            </button>
            <button
              onClick={() => addNewForm("clubs")}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm"
            >
              Add Club
            </button>
          </div>
        </div>

        {/* Sections with unique keys */}
        <div className="space-y-8">
          {/* Certifications */}
          <div key="certifications" className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Certifications</h2>
            <div className="space-y-4">
              {savedAccomplishments.certifications.map((cert, index) => (
                <div key={`cert-${cert.id || index}`} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-800">{cert.name}</h3>
                      <p className="text-sm text-gray-500">Issuer: {cert.issuer}</p>
                      {cert.year && <p className="text-sm text-gray-500">Year: {cert.year}</p>}
                      <p className="text-sm text-gray-500">Added on: {new Date(cert.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => addNewForm("certifications", cert)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                        title="Edit Certification"
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
                        onClick={() => deleteAccomplishment("certifications", cert.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        title="Delete Certification"
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
              {forms.certifications.map((form, index) => (
                <div key={`cert-form-${index}`} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-semibold text-gray-800">
                      {editingId.certifications && !isNaN(editingId.certifications) ? "Edit Certification" : "New Certification"}
                    </span>
                    <button
                      onClick={() => removeForm("certifications", index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      title="Remove Form"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => handleInputChange("certifications", index, "name", e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Certification name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Issuer *</label>
                      <input
                        type="text"
                        value={form.issuer}
                        onChange={(e) => handleInputChange("certifications", index, "issuer", e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Issuing organization"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                      <input
                        type="text"
                        value={form.year}
                        onChange={(e) => handleInputChange("certifications", index, "year", e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Year of completion"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {savedAccomplishments.certifications.length === 0 && forms.certifications.length === 0 && (
                <p className="text-gray-500 text-center w-full py-8">No certifications added yet. Add your first certification above!</p>
              )}
            </div>
          </div>

          {/* Awards */}
          <div key="awards" className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Awards</h2>
            <div className="space-y-4">
              {savedAccomplishments.awards.map((award, index) => (
                <div key={`award-${award.id || index}`} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-800">{award.name}</h3>
                      <p className="text-sm text-gray-500">Issuer: {award.issuer}</p>
                      {award.year && <p className="text-sm text-gray-500">Year: {award.year}</p>}
                      <p className="text-sm text-gray-500">Added on: {new Date(award.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => addNewForm("awards", award)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                        title="Edit Award"
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
                        onClick={() => deleteAccomplishment("awards", award.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        title="Delete Award"
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
              {forms.awards.map((form, index) => (
                <div key={`award-form-${index}`} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-semibold text-gray-800">
                      {editingId.awards && !isNaN(editingId.awards) ? "Edit Award" : "New Award"}
                    </span>
                    <button
                      onClick={() => removeForm("awards", index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      title="Remove Form"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                      <input
                        type="text"
                        value={form.title}
                        onChange={(e) => handleInputChange("awards", index, "title", e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Award title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Issuer *</label>
                      <input
                        type="text"
                        value={form.issuer}
                        onChange={(e) => handleInputChange("awards", index, "issuer", e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Awarding body"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                      <input
                        type="text"
                        value={form.year}
                        onChange={(e) => handleInputChange("awards", index, "year", e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Year received"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {savedAccomplishments.awards.length === 0 && forms.awards.length === 0 && (
                <p className="text-gray-500 text-center w-full py-8">No awards added yet. Add your first award above!</p>
              )}
            </div>
          </div>

          {/* Clubs & Committees */}
          <div key="clubs" className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Clubs & Committees</h2>
            <div className="space-y-4">
              {savedAccomplishments.clubs.map((club, index) => (
                <div key={`club-${club.id || index}`} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-800">{club.name}</h3>
                      {club.role && <p className="text-sm text-gray-500">Role: {club.role}</p>}
                      {club.year && <p className="text-sm text-gray-500">Year: {club.year}</p>}
                      <p className="text-sm text-gray-500">Added on: {new Date(club.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => addNewForm("clubs", club)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                        title="Edit Club/Committee"
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
                        onClick={() => deleteAccomplishment("clubs", club.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        title="Delete Club/Committee"
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
              {forms.clubs.map((form, index) => (
                <div key={`club-form-${index}`} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-semibold text-gray-800">
                      {editingId.clubs && !isNaN(editingId.clubs) ? "Edit Club/Committee" : "New Club/Committee"}
                    </span>
                    <button
                      onClick={() => removeForm("clubs", index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      title="Remove Form"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => handleInputChange("clubs", index, "name", e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Club or committee name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                      <input
                        type="text"
                        value={form.role}
                        onChange={(e) => handleInputChange("clubs", index, "role", e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Your role (e.g., President, Member)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                      <input
                        type="text"
                        value={form.year}
                        onChange={(e) => handleInputChange("clubs", index, "year", e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Year involved"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {savedAccomplishments.clubs.length === 0 && forms.clubs.length === 0 && (
                <p className="text-gray-500 text-center w-full py-8">No clubs or committees added yet. Add your first club above!</p>
              )}
            </div>
          </div>
        </div>

        {(forms.certifications.length > 0 || forms.awards.length > 0 || forms.clubs.length > 0) && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={saveAllAccomplishments}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save All
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Accomplishments