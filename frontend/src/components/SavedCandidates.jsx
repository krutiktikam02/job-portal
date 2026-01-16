"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Bookmark, Download, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const SavedCandidates = () => {
  const navigate = useNavigate();
  const [savedCandidates, setSavedCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUnsaveModal, setShowUnsaveModal] = useState(false);
  const [candidateToUnsave, setCandidateToUnsave] = useState(null);

  useEffect(() => {
    fetchSavedCandidates();
  }, []);

  const fetchSavedCandidates = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      
      const token = localStorage.getItem("authToken") || localStorage.getItem("token") || localStorage.getItem("jwt") || localStorage.getItem("accessToken");
      
      if (!token) {
        setError("Authentication required. Please login.");
        setSavedCandidates([]);
        setLoading(false);
        setIsRefreshing(false);
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
        throw new Error(`Failed to fetch saved candidates: ${response.status}`);
      }

      const data = await response.json();
      
      const transformedCandidates = data.map((item) => ({
        id: item.id,
        candidate_id: item.candidate_id,
        first_name: item.first_name,
        last_name: item.last_name,
        email: item.email,
        preferred_location: item.location,
        resume_url: item.resume_url,
        profile_summary: item.profile_summary,
        updated_at: item.updated_at,
      }));

      setSavedCandidates(transformedCandidates);
      setSuccessMessage(`Loaded ${transformedCandidates.length} saved candidate${transformedCandidates.length !== 1 ? "s" : ""}.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error("Error fetching saved candidates:", error);
      setError("Failed to load saved candidates. Please try again.");
      setSavedCandidates([]);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const confirmUnsave = async () => {
    if (!candidateToUnsave) return;

    try {
      const token = localStorage.getItem("authToken") || localStorage.getItem("token") || localStorage.getItem("jwt") || localStorage.getItem("accessToken");
      
      const response = await fetch(
        `${API_BASE_URL}/api/saved-candidates/${candidateToUnsave.candidate_id}`,
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
        return prev.filter((c) => c.id !== candidateToUnsave.id);
      });
      
      setShowUnsaveModal(false);
      setCandidateToUnsave(null);
      setSuccessMessage("Candidate removed from saved.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error("Error unsaving candidate:", error);
      setError("Failed to unsave candidate. Please try again.");
    }
  };

  const cancelUnsave = () => {
    setShowUnsaveModal(false);
    setCandidateToUnsave(null);
  };

  const getResumeFileExtension = (url) => {
    if (!url) return '.pdf';
    if (url.includes('.docx')) return '.docx';
    if (url.includes('.doc')) return '.doc';
    return '.pdf';
  };

  const handleDownloadResume = async (resumeUrl, firstName, lastName) => {
    if (!resumeUrl) return;

    const token =
      localStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("jwt") ||
      localStorage.getItem("accessToken");

    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      let downloadUrl = resumeUrl;
      if (resumeUrl.includes('storage.googleapis.com')) {
        downloadUrl = `${API_BASE_URL}/download?url=${encodeURIComponent(resumeUrl)}`;
      } else if (resumeUrl.startsWith('/')) {
        downloadUrl = `${API_BASE_URL}${resumeUrl}`;
      }

      const response = await fetch(downloadUrl, {
        headers,
      });

      if (!response.ok) throw new Error("Failed to download");

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = getResumeFileExtension(resumeUrl);
      a.download = `${firstName}_${lastName}_Resume${ext}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download resume");
    }
  };

  const handleUnsaveCandidate = (candidate) => {
    setCandidateToUnsave(candidate);
    setShowUnsaveModal(true);
  };

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
            Are you sure you want to remove{" "}
            <span className="font-semibold">{candidateToUnsave?.first_name} {candidateToUnsave?.last_name}</span>{" "}
            from your saved candidates? This action cannot be undone.
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

  if (loading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-800 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading saved candidates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Header Section */}
      <section className="bg-gradient-to-br from-blue-50 to-white py-20">
        <div className="w-full px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/poster-dashboard')}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-700">Saved Candidates</h1>
                  <p className="text-lg text-gray-600 mt-2">
                    Manage your bookmarked candidates and find the perfect match.
                  </p>
                </div>
              </div>
              <button
                onClick={fetchSavedCandidates}
                className="bg-blue-800 hover:bg-blue-900 text-white p-3 rounded-lg font-semibold transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
              </button>
            </div>
            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">{error}</div>}
            {successMessage && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
                {successMessage}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Results Section */}
      {savedCandidates.length > 0 ? (
        <section className="py-8 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {savedCandidates.length} Saved Candidate{savedCandidates.length !== 1 ? "s" : ""}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedCandidates.map((candidate) => (
                <div key={candidate.id} className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-800 to-blue-600 rounded-full flex items-center justify-center">
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
                      onClick={() => handleUnsaveCandidate(candidate)}
                      className="p-2 rounded-lg transition-colors text-blue-600 bg-blue-50"
                    >
                      <Bookmark className="w-5 h-5 fill-current" />
                    </button>
                  </div>

                  {candidate.profile_summary && (
                    <p className="text-sm text-gray-700 mb-4 line-clamp-3">{candidate.profile_summary}</p>
                  )}

                  <div className="flex justify-center">
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
      ) : (
        <section className="py-12 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <div className="w-16 h-16 bg-blue-200 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <Bookmark className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No Saved Candidates</h2>
            <p className="text-gray-600 mb-6">
              You haven't saved any candidates yet. Start searching and bookmark the ones you like.
            </p>
            <button onClick={() => navigate('/find-candidate')} className="bg-blue-800 hover:bg-blue-900 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
              Find Candidates
            </button>
          </div>
        </section>
      )}

      {showUnsaveModal && <UnsaveModal />}
    </div>
  );
};

export default SavedCandidates;