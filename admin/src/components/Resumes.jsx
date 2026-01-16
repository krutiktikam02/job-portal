import { useState, useEffect } from 'react';
import { Search, Download, Loader } from 'lucide-react';

const Resumes = () => {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  const token = localStorage.getItem('adminToken');

  // State
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    jobType: '',
    status: '',
    city: '',
    minSalary: 0,
    maxSalary: 999999,
  });
  const [filterOptions, setFilterOptions] = useState({
    jobTypes: [],
    cities: [],
    statuses: [],
    salaryRange: { min: 0, max: 100000 },
  });
  const [sorting, setSorting] = useState({
    sortBy: 'created_at',
    sortOrder: 'DESC',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 1,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');

  // Fetch filter options on mount
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  // Fetch resumes when filters or pagination changes
  useEffect(() => {
    fetchResumes();
  }, [filters, sorting, pagination.page]);

  const fetchFilterOptions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/resumes/filters/options`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch filter options');
      const data = await response.json();
      setFilterOptions(data);

      if (data.salaryRange) {
        setFilters((prev) => ({
          ...prev,
          minSalary: data.salaryRange.min || 0,
          maxSalary: data.salaryRange.max || 999999,
        }));
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const fetchResumes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: filters.search,
        jobType: filters.jobType,
        status: filters.status,
        city: filters.city,
        minSalary: filters.minSalary,
        maxSalary: filters.maxSalary,
        sortBy: sorting.sortBy,
        sortOrder: sorting.sortOrder,
        page: pagination.page,
        limit: pagination.limit,
      });

      const response = await fetch(`${API_BASE_URL}/api/admin/resumes?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch resumes');
      const data = await response.json();

      // Only show resumes with a valid fileUrl (PDF)
      setResumes(data.resumes.filter(r => r.fileUrl));
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching resumes:', error);
      alert('Failed to fetch resumes');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSort = (sortBy) => {
    setSorting((prev) => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'ASC' ? 'DESC' : 'ASC',
    }));
  };

  const getFileExtension = (documentType, fileUrl) => {
    if (!documentType && !fileUrl) return '.pdf';
    
    // Check file URL for extension
    if (fileUrl) {
      if (fileUrl.includes('.docx')) return '.docx';
      if (fileUrl.includes('.doc')) return '.doc';
      if (fileUrl.includes('.pdf')) return '.pdf';
    }
    
    // Check document type
    if (documentType) {
      const type = documentType.toLowerCase();
      if (type.includes('docx')) return '.docx';
      if (type.includes('doc')) return '.doc';
    }
    
    return '.pdf';
  };

  // Updated handleDownload to use backend proxy for GCS
  const handleDownload = async (id, type, fileName) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/resumes/${id}/download?type=${type}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to download file.');
      }

      const { fileUrl } = await response.json();

      // Use backend proxy for GCS URLs
      let downloadUrl = fileUrl;
      if (fileUrl && fileUrl.includes('storage.googleapis.com')) {
        downloadUrl = `${API_BASE_URL}/download?url=${encodeURIComponent(fileUrl)}`;
      }

      const fileResponse = await fetch(downloadUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!fileResponse.ok) {
        throw new Error('Failed to fetch file from URL.');
      }

      const blob = await fileResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const ext = getFileExtension(type, fileUrl);
      // Remove .pdf from fileName if present and add correct extension
      const baseFileName = fileName.replace(/\.pdf$/i, '');
      link.download = `${baseFileName}${ext}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error downloading file. Please try again later.');
    }
  };

  const handleExportAll = async () => {
    try {
      const params = new URLSearchParams({
        search: filters.search,
        jobType: filters.jobType,
        status: filters.status,
        city: filters.city,
        minSalary: filters.minSalary,
        maxSalary: filters.maxSalary,
        limit: 9999,
      });

      const response = await fetch(`${API_BASE_URL}/api/admin/resumes?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch resumes');
      const data = await response.json();

      const csvContent = [
        [
          'Name',
          'Email',
          'Phone',
          'City',
          'State',
          'Country',
          'Job Type',
          'Salary',
          'Document Type',
          'Status',
          'Created Date',
        ],
        ...data.resumes.map((r) => [
          r.name,
          r.email,
          r.phone,
          r.city,
          r.state || '',
          r.country || '',
          r.job_type || '',
          r.salary || '',
          r.documentType,
          r.status || '',
          new Date(r.created_at).toLocaleDateString(),
        ]),
      ]
        .map((row) => row.map((cell) => `"${cell}"`).join(','))
        .join('\n');

      const link = document.createElement('a');
      link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
      link.download = `resumes-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data');
    }
  };

  // Add local search filter for job title using cv_text and resume_text
  const filteredResumes = resumes.filter((resume) => {
    if (!search.trim()) return true;
    const term = search.trim().toLowerCase();
    // Check both cv_text and resume_text
    const cvText = (resume.cv_text || '').toLowerCase();
    const resumeText = (resume.resume_text || '').toLowerCase();
    return cvText.includes(term) || resumeText.includes(term);
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Resumes & CVs</h1>
          <p className="mt-2 text-gray-600">Manage and download all candidate resumes and CVs</p>
        </div>

        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-lg font-semibold text-gray-900"
            >
              Filters
            </button>
            <button
              onClick={handleExportAll}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              <Download className="h-4 w-4" />
              Export All
            </button>
          </div>

          {showFilters && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3">
                <Search className="h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full border-0 py-2 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <select
                  value={filters.jobType}
                  onChange={(e) => handleFilterChange('jobType', e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="">All Job Types</option>
                  {filterOptions.jobTypes?.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>

                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="">All Status</option>
                  {filterOptions.statuses?.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>

                <select
                  value={filters.city}
                  onChange={(e) => handleFilterChange('city', e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2"
                >
                  <option value="">All Cities</option>
                  {filterOptions.cities?.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  placeholder="Min Salary"
                  value={filters.minSalary}
                  onChange={(e) => handleFilterChange('minSalary', e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>

              <input
                type="number"
                placeholder="Max Salary"
                value={filters.maxSalary}
                onChange={(e) => handleFilterChange('maxSalary', e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 lg:max-w-xs"
              />
            </div>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg bg-white shadow">
          <div className="mb-8">
            <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2">
              <Search className="h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by job title, keyword, or resume/CV content..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="w-full border-0 py-2 outline-none text-gray-900"
              />
            </div>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : filteredResumes.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                No resumes found
              </div>
            ) : (
              filteredResumes.map((resume) => (
                <div
                  key={`${resume.documentType}-${resume.id}`}
                  className="flex items-center justify-between rounded-lg bg-white p-4 shadow hover:shadow-md transition-shadow"
                >
                  <div>
                    <h3 className="font-semibold text-gray-900">{resume.name}</h3>
                    <p className="text-sm text-gray-600">{resume.email}</p>
                  </div>
                  <button
                    onClick={() =>
                      handleDownload(
                        resume.id,
                        resume.documentType,
                        `${resume.name}-${resume.documentType}.pdf`
                      )
                    }
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {!loading && resumes.length > 0 && pagination.pages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} results
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: Math.max(1, prev.page - 1),
                    }))
                  }
                  disabled={pagination.page === 1}
                  className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-100 disabled:opacity-50"
                >
                  Previous
                </button>
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setPagination((prev) => ({ ...prev, page }))}
                    className={`rounded-lg px-3 py-2 ${
                      pagination.page === page
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: Math.min(prev.pages, prev.page + 1),
                    }))
                  }
                  disabled={pagination.page === pagination.pages}
                  className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-100 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Resumes;