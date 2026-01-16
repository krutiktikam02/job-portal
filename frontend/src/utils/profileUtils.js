// Lightweight helper to compute profile completion for the currently-logged in user
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080"

const getTokenFromStorage = () =>
  localStorage.getItem("authToken") ||
  localStorage.getItem("token") ||
  localStorage.getItem("jwt") ||
  localStorage.getItem("accessToken") ||
  null

async function apiRequest(path, opts = {}) {
  const token = getTokenFromStorage()
  const headers = opts.headers || {}
  if (token) headers["Authorization"] = `Bearer ${token}`
  if (!headers["Content-Type"] && !(opts.body instanceof FormData)) {
    headers["Content-Type"] = "application/json"
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...opts,
    headers,
  })

  if (!res.ok) {
    // try to return json error when available
    try {
      const err = await res.json()
      throw new Error(err.error || JSON.stringify(err) || res.statusText)
    } catch (e) {
      throw new Error(res.statusText || "Request failed")
    }
  }

  // try to parse json, return null on empty
  const text = await res.text()
  try {
    return text ? JSON.parse(text) : null
  } catch (e) {
    return text
  }
}

const toArray = (res) => {
  if (Array.isArray(res)) return res
  if (!res) return []
  if (Array.isArray(res.data)) return res.data
  if (typeof res === "object") {
    const arr = Object.values(res).find((v) => Array.isArray(v))
    return Array.isArray(arr) ? arr : []
  }
  return []
}

export async function getProfileCompletion() {
  // returns { percent: number, details: { ... } }
  try {
    const [profileRes, educationsRes, skillsRes, languagesRes, internshipsRes, projectsRes, employmentsRes, accomplishmentsRes] =
      await Promise.all([
        apiRequest("/api/userprofile", { method: "GET" }),
        apiRequest("/api/usereducations", { method: "GET" }),
        apiRequest("/api/userskills", { method: "GET" }),
        apiRequest("/api/userlanguages", { method: "GET" }),
        apiRequest("/api/userinternships", { method: "GET" }),
        apiRequest("/api/userprojects", { method: "GET" }),
        apiRequest("/api/useremployments", { method: "GET" }),
        apiRequest("/api/useraccomplishments", { method: "GET" }),
      ])

    const profile = profileRes || {}

    const counts = {
      education: toArray(educationsRes).length,
      skills: toArray(skillsRes).length,
      languages: toArray(languagesRes).length,
      internships: toArray(internshipsRes).length,
      projects: toArray(projectsRes).length,
      employment: toArray(employmentsRes).length,
      accomplishments: 0,
    }

    const acc = accomplishmentsRes?.data || accomplishmentsRes || {}
    const certCount = Array.isArray(acc.certifications) ? acc.certifications.length : 0
    const awardsCount = Array.isArray(acc.awards) ? acc.awards.length : 0
    const clubsCount = Array.isArray(acc.clubs)
      ? acc.clubs.length
      : Array.isArray(acc.clubsCommittees)
        ? acc.clubsCommittees.length
        : 0
    counts.accomplishments = certCount + awardsCount + clubsCount

    const basic = {
      firstName: !!(profile.first_name && String(profile.first_name).trim()),
      lastName: !!(profile.last_name && String(profile.last_name).trim()),
      email: !!(profile.email && String(profile.email).trim()),
      phone: !!(profile.phone && String(profile.phone).trim()),
      city: !!(profile.city && String(profile.city).trim()),
      state: !!(profile.state && String(profile.state).trim()),
      country: !!(profile.country && String(profile.country).trim()),
      preferredLocation: !!(profile.preferred_location && String(profile.preferred_location).trim()),
      age: !!(profile.age && String(profile.age).trim()),
      gender: !!(profile.gender && String(profile.gender).trim()),
      jobType: !!(profile.job_type && String(profile.job_type).trim()),
      expectedSalary: !!(profile.expected_salary && String(profile.expected_salary).trim()),
      profileSummary: !!(profile.profile_summary && String(profile.profile_summary).trim()),
      resume: !!(profile.resume_url && String(profile.resume_url).trim()),
      education: counts.education > 0,
      skills: counts.skills > 0,
      languages: counts.languages > 0,
      internships: counts.internships > 0,
      projects: counts.projects > 0,
      employment: counts.employment > 0,
      accomplishments: counts.accomplishments > 0,
    }

    const values = Object.values(basic)
    const completed = values.filter(Boolean).length
    const percent = Math.round((completed / values.length) * 100)

    return { percent, details: { profile, counts, breakdown: basic } }
  } catch (err) {
    console.error("getProfileCompletion error:", err)
    return { percent: 0, details: null }
  }
}

export default { getProfileCompletion }
