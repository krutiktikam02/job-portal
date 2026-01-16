// 1. Define the Backend URL
// If you deploy later, you can easily switch this to your live URL
const API_BASE_URL = 'http://localhost:8080/api';

// 2. Helper to get the Admin Token
const getAuthHeaders = () => {
  const token = localStorage.getItem('adminToken');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

// 3. The Dashboard Stats Function
export const getDashboardStats = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/dashboard-stats`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    throw error;
  }
};

// You can add more API functions here later, like:
// export const getCandidates = async () => { ... }