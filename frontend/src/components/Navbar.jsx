"use client"

import { useState, useEffect } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { User, Settings, Briefcase, LogOut, Menu, X, Bell, MessageSquare } from "lucide-react"

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isJobsOpen, setIsJobsOpen] = useState(false)
  const [isCompaniesOpen, setIsCompaniesOpen] = useState(false)
  const [isSignInOpen, setIsSignInOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userType, setUserType] = useState(null)
  const [showSignOutPopup, setShowSignOutPopup] = useState(false)
  const [showSignOutModal, setShowSignOutModal] = useState(false)
  const [targetUserType, setTargetUserType] = useState(null)
  const location = useLocation()
  const navigate = useNavigate()
  const isHomePage = location.pathname === "/"

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]))
        setIsLoggedIn(true)
        setUserType(payload.userType)
      } catch (error) {
        console.error("Error decoding token:", error)
        setIsLoggedIn(false)
        setUserType(null)
      }
    } else {
      setIsLoggedIn(false)
      setUserType(null)
    }
  }, [location])

  // Listen for storage changes (e.g., if login happens in another tab)
  useEffect(() => {
    const handleStorageChange = () => {
      const token = localStorage.getItem("token")
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]))
          setIsLoggedIn(true)
          setUserType(payload.userType)
        } catch (error) {
          setIsLoggedIn(false)
          setUserType(null)
        }
      } else {
        setIsLoggedIn(false)
        setUserType(null)
      }
    }
    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("token")
    setIsLoggedIn(false)
    setUserType(null)
    setIsProfileOpen(false)
    // Optional: Redirect to home
    window.location.href = "/"
  }

  const handleCrossUserTypeClick = (e, targetType) => {
    e.preventDefault()
    if (isLoggedIn && userType !== targetType) {
      setTargetUserType(targetType)
      setShowSignOutModal(true)
    } else {
      // If not logged in or same user type, navigate normally
      navigate("/login")
    }
  }

  const handleSignOutAndRedirect = () => {
    handleLogout()
    setShowSignOutModal(false)
    // Small delay to ensure logout completes
    setTimeout(() => {
      navigate("/login")
    }, 100)
  }

  return (
    <>
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="w-full">
          <div className="flex justify-between items-center h-16 px-4">
            {/* Logo */}
            <button
              onClick={() => {
                if (isLoggedIn && userType === "job_poster") {
                  navigate("/post-job")
                } else {
                  navigate("/")
                }
              }}
              className="flex items-center space-x-2"
            >
              <div className="w-8 h-8 bg-blue-800 rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-700">Talent Corner JobPortal</span>
            </button>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {(!isLoggedIn || userType === "job_poster") && (
                <button
                  onClick={(e) => handleCrossUserTypeClick(e, "job_seeker")}
                  className="text-gray-700 hover:text-blue-800 transition-colors"
                >
                  Find Jobs
                </button>
              )}

              {isLoggedIn && userType === "job_seeker" && (
                <>
                  <Link to="/jobs" className="text-gray-700 hover:text-blue-800 transition-colors">
                    Jobs
                  </Link>
                  {/* <Link to="/recommended-jobs" className="text-gray-700 hover:text-blue-800 transition-colors">
                    Recommended Jobs
                  </Link> */}
                </>
              )}

              {isLoggedIn && userType === "job_poster" && (
                <Link to="/find-candidate" className="text-gray-700 hover:text-blue-800 transition-colors">
                  Find CV/candidate
                </Link>
              )}

              {/* Sign In Dropdown (only show when not logged in) */}
              {!isLoggedIn ? (
                <div className="relative">
                  <button
                    className="text-gray-700 hover:text-blue-800 transition-colors"
                    onClick={() => setIsSignInOpen(!isSignInOpen)}
                  >
                    Sign In
                  </button>
                  {isSignInOpen && (
                    <div
                      className="absolute top-full left-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-2"
                    >
                      <Link 
                        to="/login" 
                        onClick={() => setIsSignInOpen(false)}
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-50"
                      >
                        Log In
                      </Link>
                      <Link 
                        to="/signup" 
                        onClick={() => setIsSignInOpen(false)}
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-50"
                      >
                        Sign Up
                      </Link>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Only show Employers/Post Job when not logged in or logged in as job seeker */}
              {(!isLoggedIn || userType === "job_seeker") && (
                <button
                  onClick={(e) => handleCrossUserTypeClick(e, "job_poster")}
                  className="text-gray-700 hover:text-blue-800 transition-colors"
                >
                  Employers/Post Job
                </button>
              )}

              {/* Profile Dropdown (only show when logged in) */}
              {isLoggedIn && (
                <div className="relative">
                  <button
                    className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                  >
                    <User className="w-4 h-4" />
                  </button>
                  {isProfileOpen && (
                    <div
                      className="absolute top-full right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2"
                    >
                      {userType === "job_poster" ? (
                        <>
                          <Link
                            to="/poster-profile"
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50"
                          >
                            <User className="w-4 h-4 mr-2" />
                            Profile
                          </Link>
                          <Link
                            to="/poster-dashboard"
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50"
                          >
                            <Briefcase className="w-4 h-4 mr-2" />
                            Dashboard
                          </Link>
                          <Link
                            to="/poster-message"
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50"
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Messages
                          </Link>
                          <Link
                            to="/poster-settings"
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50"
                          >
                            <Settings className="w-4 h-4 mr-2" />
                            Settings
                          </Link>
                          <div className="border-t border-gray-200 my-2"></div>
                          <button
                            onClick={handleLogout}
                            className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-50"
                          >
                            <LogOut className="w-4 h-4 mr-2" />
                            Sign Out
                          </button>
                        </>
                      ) : (
                        <>
                          <Link 
                            to="/profile" 
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50"
                          >
                            <User className="w-4 h-4 mr-2" />
                            Profile
                          </Link>
                          <Link 
                            to="/my-jobs" 
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50"
                          >
                            <Briefcase className="w-4 h-4 mr-2" />
                            My Jobs
                          </Link>
                          <Link 
                            to="/applicant-messages" 
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50"
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Messages
                          </Link>
                          <Link 
                            to="/settings" 
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50"
                          >
                            <Settings className="w-4 h-4 mr-2" />
                            Settings
                          </Link>
                          <div className="border-t border-gray-200 my-2"></div>
                          <button
                            onClick={handleLogout}
                            className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-50"
                          >
                            <LogOut className="w-4 h-4 mr-2" />
                            Sign Out
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button className="p-2 text-gray-700 hover:text-blue-800" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-200 px-4">
              <div className="flex flex-col space-y-4">
                {(!isLoggedIn || userType === "job_poster") && (
                  <button
                    onClick={(e) => handleCrossUserTypeClick(e, "job_seeker")}
                    className="text-left text-gray-700 hover:text-blue-800"
                  >
                    Find Jobs
                  </button>
                )}
                {isLoggedIn && userType === "job_seeker" && (
                  <>
                    <Link to="/jobs" className="text-gray-700 hover:text-blue-800">
                      Jobs
                    </Link>
                    <Link to="/recommended-jobs" className="text-gray-700 hover:text-blue-800">
                      Recommended Jobs
                    </Link>
                  </>
                )}

                {!isLoggedIn ? (
                  <>
                    <Link to="/login" className="text-gray-700 hover:text-blue-800">
                      Login
                    </Link>
                    <Link to="/signup" className="text-gray-700 hover:text-blue-800">
                      Sign Up
                    </Link>
                  </>
                ) : (
                  <>
                    {userType === "job_poster" ? (
                      <>
                        <Link to="/poster-profile" className="text-gray-700 hover:text-blue-800">
                          Profile
                        </Link>
                        <Link to="/poster-message" className="text-gray-700 hover:text-blue-800">
                          Messages
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link to="/profile" className="text-gray-700 hover:text-blue-800">
                          Profile
                        </Link>
                        <Link to="/applicant-messages" className="text-gray-700 hover:text-blue-800">
                          Messages
                        </Link>
                      </>
                    )}
                    <button onClick={handleLogout} className="text-left text-gray-700 hover:text-blue-800">
                      Sign Out
                    </button>
                  </>
                )}
                {/* Only show Post Job in mobile when not logged in or logged in as job seeker */}
                {(!isLoggedIn || userType === "job_seeker") && (
                  <button
                    onClick={(e) => handleCrossUserTypeClick(e, "job_poster")}
                    className="text-left text-gray-700 hover:text-blue-800"
                  >
                    Post Job
                  </button>
                )}

                {isLoggedIn && userType === "job_poster" && (
                  <Link to="/find-candidate" className="text-gray-700 hover:text-blue-800">
                    Find CV/candidate
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {showSignOutPopup && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            {/* Modal content */}
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Switch User Type</h3>
            <p className="text-gray-600 mb-6">
              You need to sign out first before switching to {userType === "job_seeker" ? "job poster" : "job seeker"}{" "}
              login.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleSignOutAndRedirect}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Sign Out & Continue
              </button>
              <button
                onClick={() => setShowSignOutPopup(false)}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showSignOutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Semi-blur backdrop */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowSignOutModal(false)} />

          {/* Modal content */}
          <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md mx-4 z-10">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Switch User Type</h3>
            <p className="text-gray-600 mb-6">
              You need to sign out first before switching to {userType === "job_seeker" ? "job poster" : "job seeker"}{" "}
              login.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleSignOutAndRedirect}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Sign Out & Continue
              </button>
              <button
                onClick={() => setShowSignOutModal(false)}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Navbar