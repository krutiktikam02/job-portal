// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080"

// Helper to handle fetch calls with auth token
const fetchWithAuth = async (endpoint, options = {}) => {
  const token = localStorage.getItem("adminToken")
  const defaultHeaders = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    })

    if (!response.ok) {
      let errorMessage = "Failed to fetch"
      try {
        const error = await response.json()
        errorMessage = error.error || `Server error: ${response.status}`
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`
      }
      console.error(`[API ERROR] ${endpoint}:`, errorMessage)
      throw new Error(errorMessage)
    }

    return await response.json()
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
      console.error(`[NETWORK ERROR] ${endpoint}: Cannot connect to server at ${API_BASE_URL}`)
      throw new Error(`Cannot connect to server. Make sure the backend is running at ${API_BASE_URL}`)
    }
    console.error(`[API ERROR] ${endpoint}:`, error.message)
    throw error
  }
}

// Auth API calls
export const loginAdmin = async (credentials) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || "Login failed")
    }

    return data
  } catch (error) {
    console.error("Login API error:", error)
    throw new Error(error.message || "Failed to connect to server")
  }
}

export const createAdmin = async (adminData) => {
  return fetchWithAuth("/api/admin/auth/create", {
    method: "POST",
    body: JSON.stringify(adminData),
  })
}

export const canCreateAdmin = async () => {
  const res = await fetch(`${API_BASE_URL}/api/admin/auth/can-create`, {
    headers: {
      "Content-Type": "application/json",
      ...(localStorage.getItem("adminToken") && { Authorization: `Bearer ${localStorage.getItem("adminToken")}` }),
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || "Failed to check admin creation permission")
  }

  return res.json()
}

// Dashboard API calls
export const getDashboardStats = async () => {
  const token = localStorage.getItem('adminToken');
  const response = await fetch(`${API_BASE_URL}/api/admin/dashboard/stats`, {
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json' 
    }
  });
  if (!response.ok) throw new Error('Failed to fetch stats');
  return await response.json();
};

// Users API calls
export const getUsers = async (page = 1, limit = 10, userType = "", q = "") => {
  const params = new URLSearchParams({
    page,
    limit,
    ...(userType && { userType }),
    ...(q && { q }),
  })
  return fetchWithAuth(`/api/admin/users?${params}`)
}

export const getUserDetails = async (userId) => {
  return fetchWithAuth(`/api/admin/users/${userId}`)
}

export const deleteUser = async (userId) => {
  return fetchWithAuth(`/api/admin/users/${userId}`, {
    method: "DELETE",
  })
}

// Jobs API calls
export const getJobs = async ({ page = 1, limit = 10, employment_type = "", q = "" }) => {
  const params = new URLSearchParams({
    page,
    limit,
    ...(employment_type && { employment_type }),
    ...(q && { q }),
  })
  return fetchWithAuth(`/api/admin/jobs?${params}`)
}

export const getJobDetails = async (jobId) => {
  return fetchWithAuth(`/api/admin/jobs/${jobId}`)
}

export const deleteJob = async (jobId) => {
  return fetchWithAuth(`/api/admin/jobs/${jobId}`, {
    method: "DELETE",
  })
}

export const updateJobStatus = async (jobId, status) => {
  return fetchWithAuth(`/api/admin/jobs/${jobId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  })
}

// Admin Management APIs
export const getAdminList = async () => {
  return fetchWithAuth("/api/admin/auth/list")
}

export const toggleCreatePermission = async (adminId) => {
  return fetchWithAuth(`/api/admin/auth/${adminId}/toggle-create`, {
    method: "PATCH",
  })
}

export const toggleRevokePermission = async (adminId) => {
  return fetchWithAuth(`/api/admin/auth/${adminId}/toggle-revoke`, {
    method: "PATCH",
  })
}

export const deleteAdmin = async (adminId) => {
  return fetchWithAuth(`/api/admin/auth/${adminId}`, {
    method: "DELETE",
  })
}

export const restoreAdmin = async (adminId) => {
  console.log("[v0] Restoring admin:", adminId)
  return fetchWithAuth(`/api/admin/auth/${adminId}/restore`, {
    method: "PATCH",
    body: JSON.stringify({}),
  })
}
