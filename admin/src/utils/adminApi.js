// Admin API Helper Functions
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

// Helper to handle fetch calls with auth token
const fetchWithAuth = async (endpoint, options = {}) => {
  const token = localStorage.getItem("adminToken");
  const defaultHeaders = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = "Failed to fetch";
      try {
        const error = await response.json();
        errorMessage = error.error || `Server error: ${response.status}`;
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error(`[API ERROR] ${endpoint}:`, error.message);
    throw error;
  }
};

// Export admin API functions
export const adminApi = {
  // Send promotional email
  sendEmail: async (emailData) => {
    return fetchWithAuth("/api/admin/send-email", {
      method: "POST",
      body: JSON.stringify(emailData),
    });
  },

  // Add more admin API functions as needed
};

export default adminApi;
