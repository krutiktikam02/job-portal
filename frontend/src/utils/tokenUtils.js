import { jwtDecode } from 'jwt-decode'

/**
 * Get user ID from JWT token stored in localStorage
 * @returns {string|null} User ID if token exists and is valid, null otherwise
 */
export const getUserIdFromToken = () => {
  try {
    // Try multiple possible token keys
    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('authToken') ||
      localStorage.getItem('jwt') ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('authorization')

    if (!token) {
      return null
    }

    const decoded = jwtDecode(token)
    return decoded.id || null
  } catch (error) {
    console.error('Error decoding token:', error)
    return null
  }
}

/**
 * Create a user-specific localStorage key
 * @param {string} baseKey - The base key name (e.g., 'savedJobs')
 * @param {string|null} userId - The user ID, or null to use current user
 * @returns {string} User-specific key (e.g., 'savedJobs_user123')
 */
export const getUserSpecificKey = (baseKey, userId = null) => {
  const id = userId || getUserIdFromToken()
  if (!id) {
    console.warn(`No user ID found. Using base key: ${baseKey}`)
    return baseKey
  }
  return `${baseKey}_${id}`
}

/**
 * Get user-specific data from localStorage
 * @param {string} baseKey - The base key name
 * @param {*} defaultValue - Default value if not found
 * @returns {*} Stored data or default value
 */
export const getUserSpecificData = (baseKey, defaultValue = null) => {
  try {
    const key = getUserSpecificKey(baseKey)
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : defaultValue
  } catch (error) {
    console.error(`Error retrieving user-specific data for key ${baseKey}:`, error)
    return defaultValue
  }
}

/**
 * Set user-specific data in localStorage
 * @param {string} baseKey - The base key name
 * @param {*} value - Value to store (will be JSON stringified)
 * @returns {boolean} True if successful, false otherwise
 */
export const setUserSpecificData = (baseKey, value) => {
  try {
    const key = getUserSpecificKey(baseKey)
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.error(`Error storing user-specific data for key ${baseKey}:`, error)
    return false
  }
}

/**
 * Remove user-specific data from localStorage
 * @param {string} baseKey - The base key name
 * @returns {boolean} True if successful, false otherwise
 */
export const removeUserSpecificData = (baseKey) => {
  try {
    const key = getUserSpecificKey(baseKey)
    localStorage.removeItem(key)
    return true
  } catch (error) {
    console.error(`Error removing user-specific data for key ${baseKey}:`, error)
    return false
  }
}
