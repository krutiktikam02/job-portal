import React, { useState, useEffect } from 'react'
import { getJobs, deleteJob } from '../utils/api'

function ConfirmationModal({ title, message, onConfirm, onCancel, isLoading }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 mb-6">{message}</p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function EmploymentTypeFilter({ value, onChange, availableTypes }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="border border-gray-200 rounded px-3 py-1.5 text-sm"
    >
      <option value="">All Job Types</option>
      {availableTypes.map(type => (
        <option key={type} value={type}>
          {type}
        </option>
      ))}
    </select>
  )
}

const parseEmploymentType = (typeData) => {
  if (!typeData) return []
  // Handle if it's a JSON array string like '["Full-time"]'
  if (typeof typeData === 'string' && typeData.startsWith('[')) {
    try {
      const parsed = JSON.parse(typeData)
      return Array.isArray(parsed) ? parsed : [typeData]
    } catch {
      return [typeData]
    }
  }
  // Handle if it's already an array
  if (Array.isArray(typeData)) {
    return typeData || []
  }
  return [typeData]
}

const formatDateToDDMMYYYY = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

export default function Jobs() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [employmentType, setEmploymentType] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [availableTypes, setAvailableTypes] = useState([])
  const [allAvailableTypes, setAllAvailableTypes] = useState([])

  const loadJobs = async (opts = {}) => {
    try {
      setLoading(true)
      setError(null)
      const pageNum = opts.page ?? page
      const response = await getJobs({ 
        page: pageNum, 
        employment_type: employmentType, 
        q: searchQuery, 
      })
      setJobs(response?.jobs || [])
      setPagination(response?.pagination || null)
      
      if (response?.jobs && response.jobs.length > 0) {
        const uniqueTypes = [...new Set(
          response.jobs
            .flatMap(job => parseEmploymentType(job.employment_type))
            .filter(type => type && type !== '-')
        )].sort()
        setAvailableTypes(uniqueTypes)
        
        setAllAvailableTypes(prev => {
          const merged = [...new Set([...prev, ...uniqueTypes])].sort()
          return merged
        })
      }
    } catch (err) {
      setError(err.message || 'Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadJobs()
  }, [page, employmentType])

  const handleSearch = e => {
    if (e) e.preventDefault()
    setPage(1)
    loadJobs({ page: 1 })
  }

  const handleRefresh = () => {
    setPage(1)
    loadJobs({ page: 1 })
  }

  const handleEmploymentTypeChange = newType => {
    setEmploymentType(newType)
    setPage(1)
  }

  const handleDeleteClick = (jobId, jobTitle) => {
    setDeleteConfirm({
      jobId,
      jobTitle,
    })
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return

    try {
      setDeleting(true)
      await deleteJob(deleteConfirm.jobId)
      setError(null)
      setDeleteConfirm(null)
      // Reload jobs after deletion
      loadJobs()
    } catch (err) {
      setError('Failed to delete job: ' + err.message)
      setDeleting(false)
    }
  }

  if (loading && !jobs.length) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Job Management</h1>
        <div className="text-center py-8">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Job Management</h1>
        <div className="flex gap-4 items-center flex-wrap">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search jobs by title"
              className="border border-gray-200 rounded px-3 py-1.5 text-sm flex-1"
            />
            <button 
              type="submit" 
              className="bg-blue-500 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-600"
            >
              Search
            </button>
          </form>
          <EmploymentTypeFilter value={employmentType} onChange={handleEmploymentTypeChange} availableTypes={allAvailableTypes} />
          <button 
            onClick={handleRefresh}
            className="bg-gray-100 p-2 rounded hover:bg-gray-200 text-gray-600" 
            title="Refresh"
          >
            ↻
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded mb-4">{error}</div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applications</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Posted</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {jobs.map(job => (
              <tr key={job.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{job.title}</div>
                  <div className="text-sm text-gray-500">{job.poster_name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {job.company_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {job.location || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-wrap gap-2">
                    {parseEmploymentType(job.employment_type).map((type, idx) => (
                      <span key={idx} className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {type}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {job.application_count || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDateToDDMMYYYY(job.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button 
                    onClick={() => handleDeleteClick(job.id, job.title)}
                    className="text-red-600 hover:text-red-800 font-medium"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-700">
            Showing {jobs.length === 0 ? 0 : ((page - 1) * pagination.limit) + 1} to {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} jobs
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`px-3 py-1 rounded text-sm ${
                page === 1 
                  ? 'bg-gray-100 text-gray-400' 
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= (pagination?.pages || 1)}
              className={`px-3 py-1 rounded text-sm ${
                page >= (pagination?.pages || 1)
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <ConfirmationModal
          title="Delete Job"
          message={`Are you sure you want to delete "${deleteConfirm.jobTitle}"? This action cannot be undone.`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteConfirm(null)}
          isLoading={deleting}
        />
      )}
    </div>
  )
}
