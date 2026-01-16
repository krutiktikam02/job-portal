import {
  Briefcase,
  Users,
  Target,
  Search,
  MessageSquare,
  BarChart3,
  Plus,
  Eye,
  Edit,
  Calendar,
  Star,
  Filter,
  MoreVertical,
  UserCheck,
  Video,
  Mail,
  MapPin,
  Link,
} from "lucide-react"
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const PostingDashboard = () => {
  const navigate = useNavigate()
  const [activeJobs, setActiveJobs] = useState([])
  const [recentCandidates, setRecentCandidates] = useState([])
  const [stats, setStats] = useState({
    activeJobs: 0,
    totalApplications: 0,
    interviewsScheduled: 0,
    hiredThisMonth: 0,
  })
  const [changes, setChanges] = useState({
    activeJobs: "+0 this week",
    totalApplications: "+0 today",
    interviewsScheduled: "+0 this week",
    hiredThisMonth: "+0 this month",
  })
  const [loading, setLoading] = useState(true)

  const calculateAgo = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return "Today"
    if (days < 7) return `${days} days ago`
    const weeks = Math.floor(days / 7)
    return `${weeks} week${weeks > 1 ? "s" : ""} ago`
  }

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        const token = localStorage.getItem("token")
        if (!token) {
          console.error("No token found")
          return
        }

        const jobsResponse = await fetch(`${API_BASE_URL}/api/jobs`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (!jobsResponse.ok) {
          throw new Error("Failed to fetch jobs")
        }

        const jobs = await jobsResponse.json()
        setStats((prev) => ({ ...prev, activeJobs: jobs.length }))

        const now = new Date()
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        todayStart.setHours(0, 0, 0, 0)
        const thisWeekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
        thisWeekStart.setHours(0, 0, 0, 0)
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

        const jobsThisWeek = jobs.filter((job) => new Date(job.created_at) >= thisWeekStart).length
        let totalApplications = 0
        let interviewsScheduled = 0
        let hiredThisMonth = 0
        let applicationsToday = 0
        let interviewsThisWeek = 0

        const jobPromises = jobs.map(async (job) => {
          const applicationsResponse = await fetch(`${API_BASE_URL}/api/applications/${job.id}`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          })

          if (!applicationsResponse.ok) {
            return {
              id: job.id,
              title: job.job_title || "Unknown Job",
              location: job.job_location || "Unknown Location",
              applications: 0,
              status: job.status || "Active",
              posted: calculateAgo(job.created_at),
              views: job.views || 0,
            }
          }

          const applications = await applicationsResponse.json()
          totalApplications += applications.length
          interviewsScheduled += applications.filter((app) => app.status === "interview").length

          const hiredThisMonthCount = applications.filter(
            (app) =>
              app.status === "hired" &&
              new Date(app.updated_at || app.created_at) >= thisMonthStart
          ).length
          hiredThisMonth += hiredThisMonthCount

          applicationsToday += applications.filter((app) => new Date(app.created_at) >= todayStart).length
          interviewsThisWeek += applications.filter(
            (app) =>
              app.status === "interview" &&
              new Date(app.updated_at || app.created_at) >= thisWeekStart
          ).length

          return {
            id: job.id,
            title: job.job_title || "Unknown Job",
            location: job.job_location || "Unknown Location",
            applications: applications.length,
            status: job.status || "Active",
            posted: calculateAgo(job.created_at),
            views: job.views || 0,
          }
        })

        const fetchedJobs = await Promise.all(jobPromises)
        setActiveJobs(fetchedJobs)

        // Fetch recent candidates
        let allApplications = []
        for (const job of jobs) {
          const applicationsResponse = await fetch(`${API_BASE_URL}/api/applications/${job.id}`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          })

          if (applicationsResponse.ok) {
            const applications = await applicationsResponse.json()
            allApplications = allApplications.concat(
              applications.map((app) => ({
                ...app,
                job_title: job.job_title,
              }))
            )
          }
        }

        allApplications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        const topCandidates = allApplications.slice(0, 3).map((app) => ({
          id: app.id,
          name: app.applicant_name || "Unknown Applicant",
          position: app.job_title || "Unknown Position",
          // rating: 4.5 + Math.random() * 0.5, // Mock rating
          status: app.status || "Under Review",
          avatar:
            app.applicant_name
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2) || "NA",
        }))

        setRecentCandidates(topCandidates)

        setStats({
          activeJobs: jobs.length,
          totalApplications,
          interviewsScheduled,
          hiredThisMonth,
        })

        setChanges({
          activeJobs: `+${jobsThisWeek} this week`,
          totalApplications: `+${applicationsToday} today`,
          interviewsScheduled: `+${interviewsThisWeek} this week`,
          hiredThisMonth: `+${hiredThisMonth} this month`,
        })
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-800 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const statsArray = [
    {
      icon: <Briefcase className="w-6 h-6 text-blue-800" />,
      title: "Active Jobs",
      value: stats.activeJobs.toString(),
      change: changes.activeJobs,
      link: "/active-jobs",
    },
    {
      icon: <Users className="w-6 h-6 text-blue-800" />,
      title: "Total Applications",
      value: stats.totalApplications.toString(),
      change: changes.totalApplications,
      link: "/applicants",
    },
    {
      icon: <UserCheck className="w-6 h-6 text-blue-800" />,
      title: "Interviews Scheduled",
      value: stats.interviewsScheduled.toString(),
      change: changes.interviewsScheduled,
      link: "/schedule-interview",
    },
    {
      icon: <Target className="w-6 h-6 text-blue-800" />,
      title: "Hired This Month",
      value: stats.hiredThisMonth.toString(),
      change: changes.hiredThisMonth,
      link: "/hire-number",
    },
  ]

  return (
    <div className="bg-white min-h-screen">
      {/* Header Section */}
      <section className="bg-gradient-to-br from-blue-50 to-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-700 mb-2">
                Welcome Back, <span className="text-blue-800">Employer</span>
              </h1>
              <p className="text-lg text-gray-600">Manage your hiring pipeline and find the perfect candidates</p>
            </div>
            <button 
              onClick={() => navigate('/posting-job')}
              className="bg-blue-800 hover:bg-blue-900 text-white px-6 py-3 rounded-lg font-semibold transition-colors inline-flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Post New Job</span>
            </button>
          </div>
        </div>
      </section>

      {/* Stats Overview */}
      <section className="py-8 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statsArray.map((stat, index) => (
              <div
                key={index}
                onClick={stat.link ? () => navigate(stat.link) : undefined}
                className={`p-6 rounded-lg border border-gray-200 bg-white hover:shadow-md transition-shadow cursor-pointer text-center ${
                  stat.link ? "hover:bg-blue-50" : ""
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-blue-50 rounded-lg">{stat.icon}</div>
                </div>
                <h3 className="text-2xl font-bold text-gray-700 mb-1">{stat.value}</h3>
                <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                <p className="text-xs text-green-600">{stat.change}</p>
                {/* {stat.link && <Link className="w-4 h-4 text-blue-600 mt-2 mx-auto" />} */}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Features Grid */}
      <section className="py-12 bg-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Manage Your Jobs */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-blue-800 rounded-lg">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-700">Manage Your Jobs</h3>
                    <p className="text-gray-600 text-sm">
                      Your dashboard helps you keep up with your hiring priorities. Manage open jobs, update job
                      statuses and filter applications easily.
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-semibold text-gray-700">Recent Job Posts</h4>
                  {/* <button className="text-blue-800 hover:text-blue-900 text-sm font-medium">View All</button> */}
                </div>
                <div className="space-y-3">
                  {activeJobs.map((job) => (
                    <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-700">{job.title}</h5>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                          <span className="flex items-center space-x-1">
                            <Users className="w-4 h-4" />
                            <span>{job.applications} applications</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <MapPin className="w-4 h-4" />
                            <span>{job.location}</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            job.status === "Active" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {job.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                 <div className="mt-4 pt-4 border-t border-gray-200">
                  <button 
                    onClick={() => navigate('/active-jobs')}
                    className="w-full bg-blue-50 hover:bg-blue-100 text-blue-800 py-2 rounded-lg font-medium transition-colors"
                  >
                    View all
                  </button>
                </div>
              </div>
            </div>

            {/* Choose Who Moves Forward */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-blue-800 rounded-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-700">Choose Who Moves Forward</h3>
                    <p className="text-gray-600 text-sm">
                      Review and manage applicants effortlessly. Filter, shortlist, and connect with top talent in one place.
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-semibold text-gray-700">Top Candidates</h4>
                  {/* <button className="text-blue-800 hover:text-blue-900 text-sm font-medium">View All</button> */}
                </div>
                <div className="space-y-3">
                  {recentCandidates.map((candidate) => (
                    <div key={candidate.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-800 font-medium text-sm">{candidate.avatar}</span>
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-700">{candidate.name}</h5>
                          <p className="text-sm text-gray-600">{candidate.position}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {/* <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-sm font-medium text-gray-700">{candidate.rating.toFixed(1)}</span>
                        </div> */}
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            candidate.status === "Interview Scheduled"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {candidate.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button 
                    onClick={() => navigate('/applicants')}
                    className="w-full bg-blue-50 hover:bg-blue-100 text-blue-800 py-2 rounded-lg font-medium transition-colors"
                  >
                    View applicants
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-700 mb-8 text-center">Quick Actions</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <Search className="w-6 h-6 text-blue-800" />,
                title: "Search Candidates",
                description: "Find candidates from our database",
                link: "/find-candidate",
              },
              {
                icon: <MessageSquare className="w-6 h-6 text-blue-800" />,
                title: "Send Messages",
                description: "Communicate directly with applicants",
                link: "/poster-message",
              },
              {
                icon: <Star className="w-6 h-6 text-blue-800" />,
                title: "Saved Candidates",
                description: "Access your bookmarked candidates",
                link: "/saved-candidates",
              },
              {
                icon: <BarChart3 className="w-6 h-6 text-blue-800" />,
                title: "View Analytics",
                description: "Track your hiring performance",
                link: "/view-analytics",
              },
            ].map((action, index) => (
              <div
                key={index}
                onClick={action.link ? () => navigate(action.link) : undefined}
                className={`p-5 rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer group ${
                  action.link ? "hover:bg-blue-50" : ""
                }`}
              >
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                    {action.icon}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2 text-center">{action.title}</h3>
                <p className="text-gray-600 text-sm text-center">{action.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default PostingDashboard