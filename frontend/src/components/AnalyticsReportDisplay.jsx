import { useState, useEffect } from "react"
import { ArrowLeft, Download, TrendingUp, Briefcase, FileText } from "lucide-react"

const AnalyticsReportDisplay = ({ reportData, onBack }) => {
  const [filteredJobs, setFilteredJobs] = useState([])
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (reportData?.applicationsByJob) {
      setFilteredJobs(
        reportData.applicationsByJob.filter(job =>
          job.job_title?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }
  }, [reportData, searchTerm])

  const handleExportCSV = async () => {
    try {
      const token = localStorage.getItem('token')
      let url = `${import.meta.env.VITE_API_URL || "http://localhost:8080"}/api/analytics/export?format=csv`
      
      if (reportData.type === 'overall') {
        url += '&type=overall'
      } else if (reportData.startDate && reportData.endDate) {
        url += `&type=custom&from=${reportData.startDate}&to=${reportData.endDate}`
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) throw new Error('Failed to export')
      
      const blob = await response.blob()
      const linkUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = linkUrl
      a.download = `analytics_report_${Date.now()}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(linkUrl)
      document.body.removeChild(a)
    } catch (err) {
      alert('Failed to export report: ' + err.message)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-blue-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Analytics Report</h1>
              <p className="text-gray-600 text-sm">
                {reportData.type === 'overall' 
                  ? 'All-time report since account creation'
                  : `Report from ${reportData.startDate} to ${reportData.endDate}`}
              </p>
            </div>
          </div>
          <button
            onClick={handleExportCSV}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center space-x-2 transition-colors"
          >
            <Download className="w-5 h-5" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Jobs */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Jobs Posted</p>
                <p className="text-4xl font-bold text-blue-600 mt-2">
                  {reportData.totalJobs || 0}
                </p>
              </div>
              <Briefcase className="w-12 h-12 text-blue-200" />
            </div>
          </div>

          {/* Total Applications */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Applications</p>
                <p className="text-4xl font-bold text-green-600 mt-2">
                  {reportData.totalApplications || 0}
                </p>
              </div>
              <TrendingUp className="w-12 h-12 text-green-200" />
            </div>
          </div>

          {/* Average Applications per Job */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Avg. Apps/Job</p>
                <p className="text-4xl font-bold text-purple-600 mt-2">
                  {reportData.totalJobs > 0 
                    ? (reportData.totalApplications / reportData.totalJobs).toFixed(1)
                    : 0}
                </p>
              </div>
              <FileText className="w-12 h-12 text-purple-200" />
            </div>
          </div>
        </div>

        {/* Jobs Breakdown */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Job Performance</h2>
            <input
              type="text"
              placeholder="Search job titles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {filteredJobs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No jobs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Job Title</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Company</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Applications</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Posted On</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((job, idx) => (
                    <tr
                      key={idx}
                      className={`border-b border-gray-100 hover:bg-blue-50 transition-colors ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="py-4 px-4">
                        <p className="font-semibold text-gray-800">{job.job_title}</p>
                      </td>
                      <td className="py-4 px-4 text-gray-600">{job.company_name || 'N/A'}</td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-bold">
                          {job.applicationCount}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-gray-600 text-sm">
                        {new Date(job.jobCreatedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Report generated on {new Date(reportData.generatedAt).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsReportDisplay
