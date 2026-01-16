"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MapPin, Users, Filter, Star, Calendar, Briefcase, MoreHorizontal, HelpCircle, Settings, Download, X, Mail, Phone, Bookmark, AlertCircle } from 'lucide-react';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const FindCandidate = () => {
  const navigate = useNavigate();
  const [location, setLocation] = useState("");
  const [keywords, setKeywords] = useState("");
  const [experience, setExperience] = useState("");
  const [salary, setSalary] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [showSearchSyntax, setShowSearchSyntax] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [savedCandidates, setSavedCandidates] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [showNoResultsModal, setShowNoResultsModal] = useState(false);
  const [showUnsaveModal, setShowUnsaveModal] = useState(false);
  const [candidateToUnsave, setCandidateToUnsave] = useState(null);

  useEffect(() => {
    fetchSavedCandidates();
  }, []);

  const fetchSavedCandidates = async () => {
    try {
      const token = localStorage.getItem("authToken") || localStorage.getItem("token") || localStorage.getItem("jwt") || localStorage.getItem("accessToken");
      
      if (!token) {
        setSavedCandidates(new Set());
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/saved-candidates`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch saved candidates");
      }

      const data = await response.json();
      const savedIds = new Set(data.map((item) => item.candidate_id));
      setSavedCandidates(savedIds);
    } catch (error) {
      console.error("Error fetching saved candidates:", error);
      setSavedCandidates(new Set());
    }
  };

  const handleUnsaveCandidate = (candidateId) => {
    setCandidateToUnsave({ id: candidateId });
    setShowUnsaveModal(true);
  };

  const confirmUnsave = async () => {
    if (!candidateToUnsave) return;

    try {
      const token = localStorage.getItem("authToken") || localStorage.getItem("token") || localStorage.getItem("jwt") || localStorage.getItem("accessToken");

      // Use saved_id (the actual saved_candidates table ID) for deletion
      const response = await fetch(
        `${API_BASE_URL}/api/saved-candidates/${candidateToUnsave.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to unsave candidate");
      }

      setSavedCandidates((prev) => {
        const newSet = new Set(prev);
        newSet.delete(candidateToUnsave.id);
        return newSet;
      });

      setShowUnsaveModal(false);
      setCandidateToUnsave(null);
    } catch (error) {
      console.error("Error unsaving candidate:", error);
      alert("Failed to unsave candidate");
    }
  };

  const cancelUnsave = () => {
    setShowUnsaveModal(false);
    setCandidateToUnsave(null);
  };

  const toggleSaveCandidate = async (applicationId, candidate) => {
    const isSaved = savedCandidates.has(applicationId);
    
    try {
      const token = localStorage.getItem("authToken") || localStorage.getItem("token") || localStorage.getItem("jwt") || localStorage.getItem("accessToken");

      if (isSaved) {
        // Unsave candidate
        handleUnsaveCandidate(applicationId);
      } else {
        const response = await fetch(`${API_BASE_URL}/api/saved-candidates`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            candidate_id: applicationId,
            first_name: candidate.first_name,
            last_name: candidate.last_name,
            email: candidate.email,
            location: candidate.preferred_location,
            resume_url: candidate.resume_url,
            profile_summary: candidate.profile_summary,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to save candidate");
        }

        // Update local state after successful API call
        setSavedCandidates((prev) => {
          const newSet = new Set([...prev, applicationId]);
          return newSet;
        });
      }
    } catch (error) {
      console.error("Error toggling save candidate:", error);
      alert("Failed to save candidate");
    }
  };

  const performSearch = async (searchKeywords = keywords, searchLocation = location, searchExperience = experience, searchSalary = salary) => {
    setLoading(true);
    setSearchError(null);
    try {
      const token =
        localStorage.getItem("authToken") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt") ||
        localStorage.getItem("accessToken");

      const params = new URLSearchParams();
      if (searchKeywords) params.append("keywords", searchKeywords);
      if (searchLocation) params.append("location", searchLocation);
      if (searchExperience) params.append("experience", searchExperience);
      if (searchSalary) params.append("salary", searchSalary);

      const response = await fetch(`${API_BASE_URL}/api/search/candidates?${params}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to search candidates: ${response.status}`);
      }

      const data = await response.json();
      setCandidates(data);
      if (data.length === 0) {
        setShowNoResultsModal(true);
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchError("Failed to search candidates. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    performSearch();
  };

  const getResumeFileExtension = (url) => {
    if (!url) return '.pdf';
    if (url.includes('.docx')) return '.docx';
    if (url.includes('.doc')) return '.doc';
    return '.pdf';
  };

  const handleDownloadResume = async (resumeUrl, firstName, lastName) => {
    if (!resumeUrl) return;

    try {
      const token = localStorage.getItem("authToken") || localStorage.getItem("token") || localStorage.getItem("jwt") || localStorage.getItem("accessToken");
      
      // Check if URL is already full GCS URL or relative path
      let downloadUrl;
      if (resumeUrl.includes('storage.googleapis.com')) {
        // GCS URL - use authenticated backend proxy
        downloadUrl = `${API_BASE_URL}/download?url=${encodeURIComponent(resumeUrl)}`;
      } else {
        // Relative URL - append to API base
        downloadUrl = `${API_BASE_URL}${resumeUrl}`;
      }

      console.log('[FindCandidate] Downloading from:', downloadUrl);

      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      
      if (!response.ok) throw new Error('Failed to download');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = getResumeFileExtension(resumeUrl);
      a.download = `${firstName}_${lastName}_Resume${ext}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      console.log('[FindCandidate] Download completed');
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download resume');
    }
  };

  const SearchSyntaxModal = () => (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Search syntax</h2>
            <button
              onClick={() => setShowSearchSyntax(false)}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3 text-left">Operators</h3>
              <p className="text-gray-600 mb-4 text-left">
                Boolean operators are simple words (AND, OR, NOT or AND NOT) used as conjunctions to combine or exclude
                keywords in a search, resulting in more focused and productive results.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Operators</th>
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Definition</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm font-mono">AND</span>
                        <span className="ml-2 text-gray-600">+</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        CVs will contain both of the items when using the AND operator
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-mono">OR</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        CVs will contain at least one of the items in the OR list
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm font-mono">NOT</span>
                        <span className="ml-2 text-gray-600">-</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        CVs will not contain the phrase when using the NOT operator
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-mono">&quot;&quot;</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        To search for an exact phrase, insert quotation marks around the phrase
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm font-mono">( )</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        Use parentheses to bundle search terms together
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3 text-left">Example</h3>
              <p className="text-gray-600 mb-3 text-left">
                I am looking for "Software Engineer" candidates. Their resume must have the keyword "python" mentioned
                in any section. Exclude any candidates that have "Java" or "CSS" mentioned in any section of their CV.
              </p>
              <div className="bg-gray-100 p-3 rounded font-mono text-sm">
                "Software Engineer" <span className="text-red-600 font-bold">AND</span> "python"{" "}
                <span className="text-red-600 font-bold">NOT</span> ("java"{" "}
                <span className="text-red-600 font-bold">OR</span> "css")
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3 text-left">Fields</h3>
              <p className="text-gray-600 mb-4 text-left">
                Boolean fields allow you to target specific sections in the CV. You can combine them with boolean
                operators (AND, OR, NOT, etc.). You can input your desired value to match against any field; you can
                also use one or more fields in your query.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Field</th>
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Definition</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-mono">title</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">Most recent job title</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-mono">anytitle</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        Any job title on the CV, including past experience
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-mono">jobdesc</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">Phrase in work experience</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-mono">company</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">Currently employed company</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-mono">anycompany</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">Any company in past experience</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-mono">skill</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">Skills section of the CV</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 px-4 py-2">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-mono">school</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        School (such as university) in education section
                      </td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-mono">fieldofstudy</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        Field of study (i.e. bachelor's) in education
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const NoResultsModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl transform transition-all">
        <div className="p-6 text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
            <Users className="w-8 h-8 text-yellow-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Candidates Found</h3>
          <p className="text-gray-600 mb-6">
            We couldn't find any candidates matching your search. Try adjusting your keywords or location for better results.
          </p>
          <div className="flex space-x-3">
            <button
              onClick={() => {
                setShowNoResultsModal(false);
                setKeywords("");
                setLocation("");
                setExperience("");
                setSalary("");
              }}
              className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Clear Search
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const UnsaveModal = () => (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl transform transition-all">
        <div className="p-6 text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Remove from Saved?
          </h3>
          <p className="text-gray-600 mb-6">
            Are you sure you want to remove this candidate from your saved list? This action cannot be undone.
          </p>
          <div className="flex space-x-3">
            <button
              onClick={cancelUnsave}
              className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmUnsave}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-white py-20">
        <div className="w-full px-4">
          <div className="flex justify-center items-center">
            <div className="max-w-4xl w-full">
              <div className="text-center mb-8">
                <p className="text-gray-600 mb-6">
                  To conduct a search, complete at least one field in the Job, Find CVs, Work experience, or Education
                  section and select Find candidates.
                </p>
              </div>

              {/* Main Search Interface */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl shadow-xl border border-blue-200 p-8 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                  {/* Location Input */}
                  <div className="flex flex-col">
                    <label className="text-sm font-semibold text-blue-900 mb-2">Location</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 text-blue-400 w-5 h-5" />
                      <input
                        placeholder="City, county or postcode"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* Keywords Input */}
                  <div className="flex flex-col">
                    <label className="text-sm font-semibold text-blue-900 mb-2">Keywords</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 text-blue-400 w-5 h-5" />
                      <input
                        placeholder="Skills, job, etc"
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* Experience Input */}
                  <div className="flex flex-col">
                    <label className="text-sm font-semibold text-blue-900 mb-2">Experience</label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-3 text-blue-400 w-5 h-5" />
                      <input
                        placeholder="e.g., 5 years"
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* Salary Input */}
                  <div className="flex flex-col">
                    <label className="text-sm font-semibold text-blue-900 mb-2">Salary</label>
                    <div className="relative">
                      <Star className="absolute left-3 top-3 text-blue-400 w-5 h-5" />
                      <input
                        placeholder="e.g., 50-70 LPA"
                        value={salary}
                        onChange={(e) => setSalary(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                  {/* Find Button */}
                  <button
                    onClick={handleSearch}
                    disabled={loading}
                    className="bg-blue-800 hover:bg-blue-900 text-white px-8 py-3 rounded-lg font-semibold transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-md hover:shadow-lg transform hover:scale-105"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        <span>Searching...</span>
                      </>
                    ) : (
                      <span>Find Candidates</span>
                    )}
                  </button>

                  {/* Three Dots Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="bg-blue-700 hover:bg-blue-800 text-white p-3 rounded-lg transition-all shadow-md hover:shadow-lg transform hover:scale-105"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>

                    {showDropdown && (
                      <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[200px]">
                        <button
                          onClick={() => {
                            setShowSearchSyntax(true);
                            setShowDropdown(false);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3 border-b border-gray-100"
                        >
                          <HelpCircle className="w-4 h-4 text-gray-600" />
                          <span className="text-gray-700">Search syntax</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {searchError && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
                    {searchError}
                  </div>
                )}

                {/* Search Description */}
                <div className="text-center py-6">
                  <div className="mb-4">
                    <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center shadow-md">
                      <Search className="w-10 h-10 text-blue-600" />
                    </div>
                  </div>
                  <p className="text-gray-700 text-lg">
                    Use <span className="font-bold text-blue-800">Keywords</span> to search millions of global CVs and find qualified candidates.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      {candidates.length > 0 && (
        <section className="py-8 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Found {candidates.length} candidate{candidates.length !== 1 ? "s" : ""}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {candidates.map((candidate) => (
                <div key={candidate.id} className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-lg">
                          {candidate.first_name.charAt(0).toUpperCase()}
                          {candidate.last_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{candidate.first_name} {candidate.last_name}</h3>
                        <p className="text-sm text-gray-600">{candidate.email}</p>
                        <p className="text-sm text-blue-600 flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          {candidate.preferred_location}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSaveCandidate(candidate.id, candidate);
                      }}
                      className={`p-2 rounded-lg transition-colors ${
                        savedCandidates.has(candidate.id) ? "text-blue-600 bg-blue-100" : "text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                      }`}
                    >
                      <Bookmark className={`w-5 h-5 ${savedCandidates.has(candidate.id) ? "fill-current" : ""}`} />
                    </button>
                  </div>

                  {candidate.profile_summary && (
                    <p className="text-sm text-gray-700 mb-4 line-clamp-3">{candidate.profile_summary}</p>
                  )}

                  <div className="flex justify-center items-center space-x-2">
                    {candidate.resume_url && (
                      <button
                        onClick={() => handleDownloadResume(candidate.resume_url, candidate.first_name, candidate.last_name)}
                        className="inline-flex items-center px-4 py-2 bg-blue-800 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download Resume
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {showSearchSyntax && <SearchSyntaxModal />}

      {showNoResultsModal && <NoResultsModal />}

      {showUnsaveModal && <UnsaveModal />}
    </div>
  );
};

export default FindCandidate;