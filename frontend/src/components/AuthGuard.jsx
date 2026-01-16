"use client"

import { useState, useEffect } from "react"
import { useNavigate, Outlet, useLocation } from "react-router-dom"
import { jwtDecode } from "jwt-decode"

const AuthGuard = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [isTokenValid, setIsTokenValid] = useState(true)
  const [userType, setUserType] = useState(null)

  const jobSeekerRoutes = ["/profile", "/education", "/projects", "/internships", "/employment", "/skills", "/languages", "/accomplishments",
                           "/settings", "/my-jobs", "/jobs","/applicant-messages","/recommended-jobs"]
  const jobPosterRoutes = ["/poster-profile", "/poster-settings", "/poster-dashboard", "/posting-job","/find-candidate",
                          "/active-jobs","/applicants","/schedule-interview","/hire-number","/poster-message","/view-analytics","/saved-candidates"]

  const checkTokenExpiration = () => {
    const token = localStorage.getItem("token")
    if (!token) {
      setIsTokenValid(false)
      return false
    }

    try {
      const decoded = jwtDecode(token)
      const currentTime = Date.now() / 1000
      if (decoded.exp < currentTime) {
        localStorage.removeItem("token")
        setIsTokenValid(false)
        return false
      }

      setUserType(decoded.userType || decoded.user_type)
      return true
    } catch (error) {
      console.error("Token decode error:", error)
      localStorage.removeItem("token")
      setIsTokenValid(false)
      return false
    }
  }

  const isRouteAllowed = (currentPath, userType) => {
    if (!userType) return false

    if (userType === "job_seeker") {
      return jobSeekerRoutes.includes(currentPath)
    } else if (userType === "job_poster") {
      return jobPosterRoutes.includes(currentPath)
    }

    return false
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    navigate("/login", { replace: true })
    window.location.reload()
  }

  const redirectToDefaultPage = (userType) => {
    if (userType === "job_seeker") {
      navigate("/jobs", { replace: true })
    } else if (userType === "job_poster") {
      navigate("/posting-job", { replace: true })
    }
  }

  useEffect(() => {
    if (!checkTokenExpiration()) {
      handleLogout()
      return
    }

    if (userType && !isRouteAllowed(location.pathname, userType)) {
      redirectToDefaultPage(userType)
      return
    }

    const intervalId = setInterval(() => {
      if (!checkTokenExpiration()) {
        handleLogout()
      }
    }, 30000)

    return () => clearInterval(intervalId)
  }, [location, userType])

  if (!isTokenValid) {
    // Redirect to login instead of returning null (fixes 404 on Vercel)
    navigate("/login", { replace: true })
    return null
  }

  return <Outlet />
}

export default AuthGuard