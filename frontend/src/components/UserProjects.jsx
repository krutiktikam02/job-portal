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

const Projects = () => {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [editingIndex, setEditingIndex] = useState(null)
  const [projectForm, setProjectForm] = useState({
    title: "",
    duration: "",
    description: "",
    technologies: [],
    link: "",
  })

  const fetchProjects = async () => {
    try {
      const response = await apiRequest("/api/userprojects", { method: "GET" })
      if (response) {
        setProjects(response)
      }
    } catch (error) {
      console.error("[fetchProjects] Error:", error.message)
      if (error.message.includes("401") || error.message.includes("403")) {
        console.log("[fetchProjects] Redirecting to /login due to auth failure")
        navigate("/login")
      } else {
        alert(`Error fetching projects: ${error.message}`)
      }
    }
  }

  const handleInputChange = (field, value) => {
    console.log(`[handleInputChange] Updating ${field} to:`, value)
    setProjectForm((prev) => ({ ...prev, [field]: value }))
  }

  const addTechnology = (tech) => {
    if (tech && !projectForm.technologies.includes(tech)) {
      setProjectForm((prev) => ({
        ...prev,
        technologies: [...prev.technologies, tech],
      }))
    }
  }

  const removeTechnology = (techToRemove) => {
    setProjectForm((prev) => ({
      ...prev,
      technologies: prev.technologies.filter((tech) => tech !== techToRemove),
    }))
  }

  const openForm = (index = null) => {
    if (index !== null) {
      setEditingIndex(index)
      setProjectForm({
        title: projects[index].title || "",
        duration: projects[index].duration || "",
        description: projects[index].description || "",
        technologies: projects[index].technologies ? projects[index].technologies.map(tech => tech.name || tech) : [],
        link: projects[index].link || "",
      })
    } else {
      setEditingIndex(null)
      setProjectForm({
        title: "",
        duration: "",
        description: "",
        technologies: [],
        link: "",
      })
    }
  }

  const saveProject = async () => {
    console.log("[saveProject] Starting save process, form:", JSON.stringify(projectForm, null, 2), "editingIndex:", editingIndex)
    const errors = []
    if (!projectForm.title || projectForm.title.trim() === "") errors.push("Title is required")
    if (!projectForm.description || projectForm.description.trim() === "") errors.push("Description is required")
    if (projectForm.duration && (typeof projectForm.duration !== "string" || projectForm.duration.trim() === "")) errors.push("Duration must be a non-empty string")
    if (projectForm.link && !/^(https?:\/\/)?([\w-]+(\.[\w-]+)+\/?|localhost)(:\d+)?([/]?[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/.test(projectForm.link)) errors.push("Link must be a valid URL")
    if (projectForm.technologies && (!Array.isArray(projectForm.technologies) || projectForm.technologies.some(t => typeof t !== "string" || t.trim() === ""))) errors.push("Technologies must be an array of non-empty strings")

    if (errors.length > 0) {
      console.log("[saveProject] Validation errors:", errors)
      alert(errors.join("\n"))
      return
    }

    try {
      const payload = {
        title: projectForm.title.trim(),
        duration: projectForm.duration ? projectForm.duration.trim() : null,
        description: projectForm.description.trim(),
        link: projectForm.link ? projectForm.link.trim() : null,
        technologies: projectForm.technologies.map(t => t.trim()),
      }
      if (editingIndex !== null && projects[editingIndex]?.id) {
        console.log("[saveProject] Updating project ID:", projects[editingIndex].id)
        await apiRequest(`/api/userprojects/${projects[editingIndex].id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        })
      } else {
        console.log("[saveProject] Adding new project")
        await apiRequest("/api/userprojects", {
          method: "POST",
          body: JSON.stringify(payload),
        })
      }
      await fetchProjects()
      openForm() // Reset form
      alert("Project saved successfully!")
    } catch (error) {
      console.error("[saveProject] Error:", error.message)
      if (error.message.includes("401") || error.message.includes("403")) {
        console.log("[saveProject] Redirecting to /login due to auth failure")
        navigate("/login")
      } else if (error.message.includes("404")) {
        alert("Error: Project not found or server endpoint issue. Please check the server configuration.")
      } else if (error.message.includes("not JSON")) {
        alert("Error: Server returned an unexpected response (HTML instead of JSON). Please check the server configuration or API URL.")
      } else {
        alert(`Error saving project: ${error.message}`)
      }
    }
  }

  const deleteProject = async (id, index) => {
    console.log(`[deleteProject] Deleting project with ID:`, id)
    if (!id || isNaN(id)) {
      console.error("[deleteProject] Error: Invalid or missing ID")
      alert("Error: Cannot delete project. Invalid ID.")
      return
    }
    const confirmed = window.confirm("Are you sure you want to delete this project?")
    if (!confirmed) {
      console.log("[deleteProject] Deletion cancelled by user")
      return
    }

    try {
      await apiRequest(`/api/userprojects/${id}`, { method: "DELETE" })
      console.log(`[deleteProject] Successfully deleted project with ID:`, id)
      setProjects(projects.filter((_, i) => i !== index))
      alert("Project deleted successfully!")
    } catch (error) {
      console.error("[deleteProject] Error:", error.message)
      if (error.message.includes("404")) {
        alert("Error: Project not found. It may have already been deleted.")
        await fetchProjects()
      } else if (error.message.includes("401") || error.message.includes("403")) {
        console.log("[deleteProject] Redirecting to /login due to auth failure")
        navigate("/login")
      } else if (error.message.includes("not JSON")) {
        alert("Error: Server returned an unexpected response (HTML instead of JSON). Please check the server configuration or API URL.")
      } else {
        alert(`Error deleting project: ${error.message}`)
      }
    }
  }

  useEffect(() => {
    fetchProjects()
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
              <span className="text-indigo-600">Projects</span> Management
            </h1>
          </div>
          <button
            onClick={() => openForm()}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
          >
            Add Project
          </button>
        </div>

        {/* Projects List */}
        <div className="grid gap-6 mb-6">
          {projects.map((project, index) => (
            <div key={project.id || index} className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{project.title}</h3>
                  {project.duration && <p className="text-gray-600 mb-2">Duration: {project.duration}</p>}
                  {project.link && (
                    <a
                      href={project.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 mb-2 inline-block"
                    >
                      View Project →
                    </a>
                  )}
                  <p className="text-gray-700 mb-3">{project.description}</p>
                  {project.technologies && project.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {project.technologies.map((tech, techIndex) => (
                        <span key={techIndex} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                          {tech.name || tech}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openForm(index)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                    title="Edit Project"
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
                    onClick={() => deleteProject(project.id, index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                    title="Delete Project"
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
          {projects.length === 0 && (
            <p className="text-gray-500 text-center w-full py-8">No projects added yet. Add your first project below!</p>
          )}
        </div>

        {/* Project Form */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {editingIndex !== null ? "Edit Project" : "Add Project"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Project Title *</label>
              <input
                type="text"
                value={projectForm.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Project name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Duration</label>
              <input
                type="text"
                value={projectForm.duration}
                onChange={(e) => handleInputChange("duration", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 3 months, Jan 2023 - Mar 2023"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Project Link (Optional)</label>
              <input
                type="url"
                value={projectForm.link}
                onChange={(e) => handleInputChange("link", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://github.com/username/project or live demo link"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Description *</label>
              <textarea
                value={projectForm.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe your project..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Technologies Used</label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Add technology"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      addTechnology(e.target.value.trim())
                      e.target.value = ""
                    }
                  }}
                />
                <button
                  onClick={(e) => {
                    const input = e.target.previousElementSibling
                    addTechnology(input.value.trim())
                    input.value = ""
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {projectForm.technologies.map((tech, techIndex) => (
                  <span
                    key={techIndex}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                  >
                    {tech}
                    <button
                      onClick={() => removeTechnology(tech)}
                      className="hover:bg-green-200 rounded-full p-1 transition-colors"
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
              onClick={saveProject}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Project
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Projects