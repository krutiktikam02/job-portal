"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import jsPDF from "jspdf"
import { Download, FileText, X, Check } from "lucide-react"

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

const Profile = () => {
  const navigate = useNavigate()
  
  // Initialize with completely blank/empty data - no defaults shown unless user enters data
  const getInitialProfileState = () => ({
    basicInfo: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      city: "",
      state: "",
      country: "",
      preferredLocation: "",
      age: "",
      gender: "",
      jobType: "",
      expectedSalary: "",
      profilePhotoUrl: "",
    },
    profileSummary: "",
    skills: [],
    languages: [],
    internships: [],
    projects: [],
    accomplishments: {
      certifications: [],
      awards: [],
      clubsCommittees: [],
    },
    employment: [],
    education: [],
    resume: { file: null, url: "" },
  })

  const [profileData, setProfileData] = useState(getInitialProfileState())

  const [counts, setCounts] = useState({
    education: 0,
    skills: 0,
    languages: 0,
    internships: 0,
    projects: 0,
    employment: 0,
    accomplishments: {
      certifications: 0,
      awards: 0,
      clubs: 0, // API uses 'clubs'
      total: 0,
    },
  })

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [apiConnected, setApiConnected] = useState(false)

  const [previewPhoto, setPreviewPhoto] = useState("")
  const [resumeLoadError, setResumeLoadError] = useState(false)
  const [showResumeModal, setShowResumeModal] = useState(false)

  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmTitle, setConfirmTitle] = useState('')
  const [confirmMessage, setConfirmMessage] = useState('')
  const [onConfirmAction, setOnConfirmAction] = useState(() => () => {})
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState('success')

  console.log("[v0] API_BASE_URL:", API_BASE_URL)

  const openConfirm = (title, message, confirmAction) => {
    setConfirmTitle(title)
    setConfirmMessage(message)
    setOnConfirmAction(() => confirmAction)
    setShowConfirmModal(true)
  }

  const handleConfirmYes = () => {
    onConfirmAction()
    setShowConfirmModal(false)
  }

  const handleConfirmNo = () => {
    setShowConfirmModal(false)
  }

  const openAlert = (message, type = 'success') => {
    setAlertMessage(message)
    setAlertType(type)
    setShowAlertModal(true)
  }

  const closeAlert = () => {
    setShowAlertModal(false)
  }

  const apiRequest = async (url, options = {}) => {
    try {
      // Check multiple possible token storage keys
      const token =
        localStorage.getItem("authToken") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt") ||
        localStorage.getItem("accessToken")

      console.log("[v0] Token found:", token ? "Yes" : "No", "for", url)

      const response = await fetch(`${API_BASE_URL}${url}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
          ...options.headers,
        },
        ...options,
      })

      if (!response.ok) {
        if (response.status === 401) {
          console.error("[v0] Authentication failed - token may be invalid or expired")
          openAlert("❌ Authentication failed. Please login again.", 'error')
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const json = await response.json()
      console.log("[v0] API success:", url, json)
      return json
    } catch (error) {
      console.warn(`[v0] API Error for ${url}:`, error.message)

      // For POST/PUT/DELETE operations, return success without actual API call
      if (options.method && options.method !== "GET") {
        console.warn(`[v0] Mock response for ${options.method} ${url}`)
        return { success: true, data: {} }
      }

      // Return empty data for GET requests when API is not available
      return { success: true, data: [] }
    }
  }

  const uploadFile = async (endpoint, fieldName, file) => {
    // Reuse the same token resolution logic as apiRequest
    const token =
      localStorage.getItem("authToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("jwt") ||
      localStorage.getItem("accessToken")

    const formData = new FormData()
    formData.append(fieldName, file)

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    })

    if (!res.ok) {
      if (res.status === 401) {
        console.error("[v0] Authentication failed during upload")
        openAlert("❌ Authentication failed. Please login again.", 'error')
      }
      throw new Error(`Upload failed with status ${res.status}`)
    }

    const json = await res.json()
    console.log("[v0] Upload success:", endpoint, json)
    return json // expected { url: "/Uploads/filename.ext" }
  }

  const getToken = () => 
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    localStorage.getItem("accessToken");

  const getResumeFileExtension = () => {
    const url = profileData.resume.url || ''
    if (url.includes('.docx')) return '.docx'
    if (url.includes('.doc')) return '.doc'
    return '.pdf'
  }

  const handleDownloadResume = async () => {
    if (!profileData.resume.url) return;

    try {
      // Always use backend proxy for authenticated GCS download
      const downloadUrl = `${API_BASE_URL}/download?url=${encodeURIComponent(profileData.resume.url)}`;
      
      console.log('[v0] Downloading from:', downloadUrl);
      
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('Failed to download');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = getResumeFileExtension()
      a.download = `${profileData.basicInfo.firstName}_${profileData.basicInfo.lastName}_Resume${ext}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log('[v0] Download completed successfully');
    } catch (error) {
      console.error('Download error:', error);
      openAlert('Failed to download resume', 'error');
    }
  };

  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      console.log("[v0] Fetching: /api/userprofile")
      const response = await apiRequest("/api/userprofile", {
        method: "GET",
      })
      if (response) {
        const userData = response
        console.log("[v0] Mapping user profile data:", userData)
        
        // Only set values if they actually exist and are not empty strings or null
        setProfileData({
          basicInfo: {
            firstName: userData.first_name && userData.first_name.trim() ? userData.first_name : "",
            lastName: userData.last_name && userData.last_name.trim() ? userData.last_name : "",
            email: userData.email && userData.email.trim() ? userData.email : "",
            phone: userData.phone && userData.phone.trim() ? userData.phone : "",
            city: userData.city && userData.city.trim() ? userData.city : "",
            state: userData.state && userData.state.trim() ? userData.state : "",
            country: userData.country && userData.country.trim() ? userData.country : "",
            preferredLocation: userData.preferred_location && userData.preferred_location.trim() ? userData.preferred_location : "",
            age: userData.age && userData.age.toString().trim() ? userData.age.toString() : "",
            gender: userData.gender && userData.gender.trim() ? userData.gender : "",
            jobType: userData.job_type && userData.job_type.trim() ? userData.job_type : "",
            expectedSalary: userData.expected_salary && userData.expected_salary.toString().trim() ? userData.expected_salary.toString() : "",
            profilePhotoUrl: userData.profile_photo_url && userData.profile_photo_url.trim() ? userData.profile_photo_url : "",
          },
          profileSummary: userData.profile_summary && userData.profile_summary.trim() ? userData.profile_summary : "",
          // note: arrays below may not be populated by this endpoint; we fetch counts separately
          skills: Array.isArray(userData.skills) && userData.skills.length > 0 ? userData.skills : [],
          languages: Array.isArray(userData.languages) && userData.languages.length > 0 ? userData.languages : [],
          internships: Array.isArray(userData.internships) && userData.internships.length > 0 ? userData.internships : [],
          projects: Array.isArray(userData.projects) && userData.projects.length > 0 ? userData.projects : [],
          accomplishments: userData.accomplishments && Object.keys(userData.accomplishments).length > 0 ? userData.accomplishments : {
            certifications: [],
            awards: [],
            clubsCommittees: [],
          },
          employment: Array.isArray(userData.employment) && userData.employment.length > 0 ? userData.employment : [],
          education: Array.isArray(userData.education) && userData.education.length > 0 ? userData.education : [],
          resume: { file: null, url: userData.resume_url && userData.resume_url.trim() ? userData.resume_url : "" },
        })
      } else {
        console.error("[v0] Failed to fetch user profile:", response?.message)
        // Keep profile data blank on error
        setProfileData(getInitialProfileState())
      }
    } catch (error) {
      console.error("[v0] Error fetching user profile:", error)
      // Keep profile data blank on error
      setProfileData(getInitialProfileState())
    } finally {
      setLoading(false)
    }
  }

  const toArray = (res) => {
    if (Array.isArray(res)) return res
    if (Array.isArray(res?.data)) return res.data
    // if the API returned an object with a single array value
    if (res && typeof res === "object") {
      const arr = Object.values(res).find((v) => Array.isArray(v))
      return Array.isArray(arr) ? arr : []
    }
    return []
  }

  const fetchCounts = async () => {
    try {
      console.log("[v0] fetchCounts: starting parallel requests...")
      const [educationsRes, skillsRes, languagesRes, internshipsRes, projectsRes, employmentsRes, accomplishmentsRes] =
        await Promise.all([
          apiRequest("/api/usereducations", { method: "GET" }),
          apiRequest("/api/userskills", { method: "GET" }),
          apiRequest("/api/userlanguages", { method: "GET" }),
          apiRequest("/api/userinternships", { method: "GET" }),
          apiRequest("/api/userprojects", { method: "GET" }),
          apiRequest("/api/useremployments", { method: "GET" }),
          apiRequest("/api/useraccomplishments", { method: "GET" }),
        ])

      const educationCount = toArray(educationsRes).length
      const skillsCount = toArray(skillsRes).length
      const languagesCount = toArray(languagesRes).length
      const internshipsCount = toArray(internshipsRes).length
      const projectsCount = toArray(projectsRes).length
      const employmentCount = toArray(employmentsRes).length

      // accomplishments can be an object with arrays (certifications, awards, clubs)
      const acc = accomplishmentsRes?.data || accomplishmentsRes || {}
      const certCount = Array.isArray(acc.certifications) ? acc.certifications.length : 0
      const awardsCount = Array.isArray(acc.awards) ? acc.awards.length : 0
      const clubsCount = Array.isArray(acc.clubs)
        ? acc.clubs.length
        : Array.isArray(acc.clubsCommittees)
          ? acc.clubsCommittees.length
          : 0
      const totalAcc = certCount + awardsCount + clubsCount

      const newCounts = {
        education: educationCount,
        skills: skillsCount,
        languages: languagesCount,
        internships: internshipsCount,
        projects: projectsCount,
        employment: employmentCount,
        accomplishments: {
          certifications: certCount,
          awards: awardsCount,
          clubs: clubsCount,
          total: totalAcc,
        },
      }

      console.log("[v0] fetchCounts: computed counts", newCounts)
      setCounts(newCounts)
    } catch (err) {
      console.error("[v0] fetchCounts error:", err)
    }
  }

  useEffect(() => {
    // initial load of profile and counts
    fetchUserProfile()
    fetchCounts()
  }, [])

  useEffect(() => {
    // log whenever counts change for easier debugging
    console.log("[v0] Counts updated:", counts)
  }, [counts])

  // Calculate profile completion percentage (dynamic based on API counts + key fields)
  const calculateCompletion = () => {
    const basic = profileData.basicInfo || {}

    const sections = {
      firstName: !!(basic.firstName && String(basic.firstName).trim()),
      lastName: !!(basic.lastName && String(basic.lastName).trim()),
      email: !!(basic.email && String(basic.email).trim()),
      phone: !!(basic.phone && String(basic.phone).trim()),
      city: !!(basic.city && String(basic.city).trim()),
      state: !!(basic.state && String(basic.state).trim()),
      country: !!(basic.country && String(basic.country).trim()),
      preferredLocation: !!(basic.preferredLocation && String(basic.preferredLocation).trim()),
      age: !!(basic.age && String(basic.age).trim()),
      gender: !!(basic.gender && String(basic.gender).trim()),
      jobType: !!(basic.jobType && String(basic.jobType).trim()),
      expectedSalary: !!(basic.expectedSalary && String(basic.expectedSalary).trim()),
      profileSummary: !!(profileData.profileSummary && String(profileData.profileSummary).trim()),
      resume: !!(profileData.resume?.url && String(profileData.resume.url).trim()),
      education: (counts.education ?? 0) > 0,
      skills: (counts.skills ?? 0) > 0,
      languages: (counts.languages ?? 0) > 0,
      internships: (counts.internships ?? 0) > 0,
      projects: (counts.projects ?? 0) > 0,
      employment: (counts.employment ?? 0) > 0,
      accomplishments: (counts.accomplishments?.total ?? 0) > 0,
    }

    const values = Object.values(sections)
    const completed = values.filter(Boolean).length
    const percent = Math.round((completed / values.length) * 100)

    console.log("[v0] Completion breakdown:", sections, "=>", percent + "%")
    return percent
  }

  const validateField = (name, value) => {
    const newErrors = { ...errors }

    switch (name) {
      case "firstName":
        if (!value.trim()) {
          newErrors.firstName = "First name is required"
        } else {
          delete newErrors.firstName
        }
        break
      case "lastName":
        if (!value.trim()) {
          newErrors.lastName = "Last name is required"
        } else {
          delete newErrors.lastName
        }
        break
      case "email":
        if (!value.trim()) {
          newErrors.email = "Email is required"
        } else if (!/\S+@\S+\.\S+/.test(value)) {
          newErrors.email = "Please enter a valid email address"
        } else {
          delete newErrors.email
        }
        break
      case "phone":
        if (!value.trim()) {
          newErrors.phone = "Phone number is required"
        } else if (!/^[+]?[0-9\s\-$$$$]{10,}$/.test(value)) {
          newErrors.phone = "Please enter a valid phone number"
        } else {
          delete newErrors.phone
        }
        break
      case "city":
        if (!value.trim()) {
          newErrors.city = "City is required"
        } else {
          delete newErrors.city
        }
        break
      case "state":
        if (!value.trim()) {
          newErrors.state = "State is required"
        } else {
          delete newErrors.state
        }
        break
      case "country":
        if (!value.trim()) {
          newErrors.country = "Country is required"
        } else {
          delete newErrors.country
        }
        break
      case "age": // replaced pincode validation with age validation
        if (!value.trim()) {
          newErrors.age = "Age is required"
        } else if (!/^\d{1,3}$/.test(value) || Number.parseInt(value) < 1 || Number.parseInt(value) > 120) {
          newErrors.age = "Please enter a valid age"
        } else {
          delete newErrors.age
        }
        break
      case "expectedSalary":
        if (!value.trim()) {
          newErrors.expectedSalary = "Expected salary is required"
        } else {
          delete newErrors.expectedSalary
        }
        break
      case "gender":
        if (!value.trim()) {
          newErrors.gender = "Gender is required"
        } else {
          delete newErrors.gender
        }
        break
      case "jobType":
        if (!value.trim()) {
          newErrors.jobType = "Job type is required"
        } else {
          delete newErrors.jobType
        }
        break
      case "preferredLocation":
        if (!value.trim()) {
          newErrors.preferredLocation = "Preferred location is required"
        } else {
          delete newErrors.preferredLocation
        }
        break
      default:
        break
    }

    setErrors(newErrors)
  }

  const handleInputChange = (section, field, value) => {
    setProfileData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }))

    // Real-time validation
    if (section === "basicInfo") {
      validateField(field, value)
    }
  }

  const handleFileUpload = async (event, type) => {
    const file = event.target.files?.[0]
    if (!file) return

    // File size validation
    const maxSize = type === "profilePhoto" ? 5 * 1024 * 1024 : 10 * 1024 * 1024 // 5MB for photos, 10MB for resumes
    if (file.size > maxSize) {
      openAlert(`❌ File too large. Maximum size is ${maxSize / (1024 * 1024)}MB`, 'error')
      return
    }

    try {
      if (type === "profilePhoto") {
        // Validate image file type
        if (!file.type.startsWith("image/")) {
          openAlert("❌ Please select a valid image file", 'error')
          return
        }

        const reader = new FileReader()
        reader.onload = (e) => {
          const dataUrl = e.target?.result
          console.log("[v0] Setting preview photo:", dataUrl ? "Data URL created" : "Failed")

          // Set immediate preview
          setPreviewPhoto(dataUrl)
        }
        reader.readAsDataURL(file)

        // Upload to server and replace with persistent URL
        const { url } = await uploadFile("/api/userprofile/upload/photo", "profilePhoto", file)
        console.log("[v0] Server upload complete, URL:", url)

        setProfileData((prev) => ({
          ...prev,
          basicInfo: {
            ...prev.basicInfo,
            profilePhotoUrl: url, // persist server URL
          },
        }))

        // Only clear preview after a short delay to ensure server URL is displayed
        setTimeout(() => {
          setPreviewPhoto("")
        }, 500)

        openAlert("✅ Profile photo uploaded successfully!", 'success')
      } else if (type === "resume") {
        // Accept Word documents (.doc, .docx) or PDF files
        const allowedMimeTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        const lowerFileName = (file.name || '').toLowerCase();
        const allowedExtensions = ['.pdf', '.doc', '.docx'];

        const hasValidMime = allowedMimeTypes.includes(file.type);
        const hasValidExt = allowedExtensions.some(ext => lowerFileName.endsWith(ext));

        if (!hasValidMime && !hasValidExt) {
          openAlert("❌ Please upload a PDF or Word document (.doc, .docx)", 'error')
          return
        }

        console.log('[v0] Starting resume upload for file:', file.name, 'size:', file.size)

        // Upload to server - backend will extract text and save to DB
        const { url } = await uploadFile('/api/userprofile/upload/resume', 'resume', file)
        
        console.log('[v0] Resume uploaded to URL:', url)

        // Update profile data with the uploaded resume
        setProfileData((prev) => ({
          ...prev,
          resume: {
            file: {
              name: file.name,
              size: file.size,
              type: file.type,
            },
            url,
          },
        }))

        // Reset load error on new upload
        setResumeLoadError(false)

        openAlert('✅ Resume uploaded successfully!', 'success')
      }
    } catch (err) {
      console.error("[v0] File upload failed:", err)
      openAlert("❌ Upload failed. Please try again.", 'error')
      if (type === "profilePhoto") {
        setPreviewPhoto("")
      }
    }
  }

  const handleDeletePhoto = async () => {
    openConfirm(
      "Confirm Photo Removal",
      "Are you sure you want to remove your profile photo?",
      async () => {
        try {
          // Call API to delete photo from server
          await apiRequest("/api/userprofile/delete/photo", {
            method: "DELETE",
          })

          setPreviewPhoto("")
          setProfileData((prev) => ({
            ...prev,
            basicInfo: {
              ...prev.basicInfo,
              profilePhotoUrl: "",
            },
          }))

          openAlert("✅ Profile photo deleted successfully!", 'success')
        } catch (error) {
          console.error("[v0] Failed to delete photo:", error)
          openAlert("❌ Failed to delete photo. Please try again.", 'error')
        }
      }
    )
  }

  const handleDeleteResume = async () => {
    openConfirm(
      "Confirm Resume Removal",
      "Are you sure you want to remove your resume?",
      async () => {
        try {
          // Call API to delete resume from server
          await apiRequest("/api/userprofile/delete/resume", {
            method: "DELETE",
          })

          // Clear resume from state
          setProfileData((prev) => ({
            ...prev,
            resume: { file: null, url: "" },
          }))

          // Reset load error
          setResumeLoadError(false)

          openAlert("✅ Resume deleted successfully!", 'success')
        } catch (error) {
          console.error("[v0] Failed to delete resume:", error)
          openAlert("❌ Failed to delete resume. Please try again.", 'error')
        }
      }
    )
  }

  const handleResumeLoadError = () => {
    setResumeLoadError(true)
  }

  const handlePreviewResume = () => {
    setResumeLoadError(false)
    setShowResumeModal(true)
  }

  const updateProfile = async (data) => {
    try {
      console.log("[v0] updateProfile called with data:", data)

      // Flatten the basicInfo object for API with correct field mapping
      const flattenedData = {
        firstName: data.basicInfo.firstName,
        lastName: data.basicInfo.lastName,
        email: data.basicInfo.email,
        phone: data.basicInfo.phone,
        city: data.basicInfo.city,
        state: data.basicInfo.state,
        country: data.basicInfo.country,
        preferredLocation: data.basicInfo.preferredLocation,
        age: data.basicInfo.age,
        gender: data.basicInfo.gender,
        jobType: data.basicInfo.jobType,
        expectedSalary: data.basicInfo.expectedSalary,
        // fixed key name to what the backend expects
        profileSummary: data.profileSummary || null,
        // fixed to camelCase keys and ensure they are persistent server URLs
        profilePhotoUrl: data.basicInfo.profilePhotoUrl || null,
        resumeUrl: (data.resume && data.resume.url) || null,
      }

      console.log("[v0] Sending flattened data to API:", flattenedData)

      const response = await apiRequest("/api/userprofile", {
        method: "PUT",
        body: JSON.stringify(flattenedData),
      })

      console.log("[v0] API response:", response)

      if (response?.message && response.message.includes("successfully")) {
        console.log("[v0] Profile saved successfully, showing popup")
        openAlert("✅ Profile saved successfully!", 'success')
      } else {
        console.log("[v0] Profile save failed, showing error popup")
        openAlert("❌ Unable to save profile. Please try again.", 'error')
      }
    } catch (error) {
      console.error("[v0] Profile update error:", error)
      openAlert("❌ Unable to save profile. Please try again.", 'error')
      setErrors((prev) => ({ ...prev, profile: "Failed to update profile" }))
    }
  }

  const generatePDF = () => {
    const doc = new jsPDF()
    let yPosition = 20

    // Header with name and contact info
    doc.setFontSize(20)
    doc.setFont(undefined, "bold")
    doc.text(`${profileData.basicInfo.firstName} ${profileData.basicInfo.lastName}`, 15, yPosition)
    yPosition += 10

    // Contact Information
    doc.setFontSize(10)
    doc.setFont(undefined, "normal")
    const contactInfo = []
    if (profileData.basicInfo.email) contactInfo.push(`Email: ${profileData.basicInfo.email}`)
    if (profileData.basicInfo.phone) contactInfo.push(`Phone: ${profileData.basicInfo.phone}`)
    if (profileData.basicInfo.city || profileData.basicInfo.state || profileData.basicInfo.country) {
      const address = `${profileData.basicInfo.city ? profileData.basicInfo.city + "," : ""} ${profileData.basicInfo.state ? profileData.basicInfo.state + "," : ""} ${profileData.basicInfo.country}`
      contactInfo.push(`Address: ${address}`)
    }

    contactInfo.forEach((info) => {
      doc.text(info, 15, yPosition)
      yPosition += 5
    })
    yPosition += 10

    // Summary
    if (profileData.profileSummary) {
      doc.setFontSize(12)
      doc.setFont(undefined, "bold")
      doc.text("SUMMARY", 15, yPosition)
      yPosition += 7
      doc.setFont(undefined, "normal")
      doc.setFontSize(10)
      const summaryLines = doc.splitTextToSize(profileData.profileSummary, 180)
      doc.text(summaryLines, 15, yPosition)
      yPosition += summaryLines.length * 4 + 10
    }

    // Save the PDF
    doc.save(`${profileData.basicInfo.firstName}_${profileData.basicInfo.lastName}_Resume.pdf`)
  }

  const handleSaveProfile = async () => {
    try {
      console.log("[v0] handleSaveProfile called")
      setLoading(true)

      // Validate required fields
      const requiredFields = [
        "firstName",
        "lastName",
        "email",
        "phone",
        "city",
        "state",
        "country",
        "preferredLocation",
        "age",
        "gender",
        "jobType",
        "expectedSalary",
      ]
      const missingFields = requiredFields.filter(
        (field) => !profileData.basicInfo[field] || profileData.basicInfo[field].toString().trim() === "",
      )

      if (missingFields.length > 0) {
        console.log("[v0] Missing fields:", missingFields)
        openAlert(`❌ Please fill in all required fields: ${missingFields.join(", ")}`, 'error')
        setLoading(false)
        return
      }

      console.log("[v0] All fields validated, calling updateProfile")
      await updateProfile(profileData)

      // Optional: refresh counts after saving, in case backend derives anything
      await fetchCounts()
    } catch (error) {
      console.error("[v0] Save profile error:", error)
      openAlert("❌ Unable to save profile. Please try again.", 'error')
    } finally {
      setLoading(false)
    }
  }

  const completion = calculateCompletion()

  // Check if resume URL is already a full GCS URL or needs to be appended to API base
  const getFullResumeUrl = () => {
    if (!profileData.resume.url) return ""
    if (profileData.resume.url.startsWith('http://') || profileData.resume.url.startsWith('https://')) {
      // Already a full URL (GCS)
      return profileData.resume.url
    }
    // Relative URL - append to API base
    return `${API_BASE_URL}${profileData.resume.url}`
  }

  const fullResumeUrl = getFullResumeUrl()

  const photoUrl = profileData.basicInfo.profilePhotoUrl
  const displayPhotoSrc = previewPhoto || (photoUrl ? `${API_BASE_URL}${photoUrl}` : null)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto py-8 px-26">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-2">
            Professional <span className="text-blue-800">Profile Builder</span>
          </h1>
          <p className="text-lg text-gray-600">Create your comprehensive professional profile</p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-base font-medium text-gray-700">Profile Completion</span>
            <span className="text-base font-medium text-blue-600">{completion}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completion}%` }}
            ></div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Basic Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Basic Information
              </h2>

              <div className="mb-6">
                <label className="block text-base font-semibold text-gray-700 mb-2">Profile Photo</label>

                {displayPhotoSrc ? (
                  <div className="mb-4">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-300 mx-auto">
                      <img
                        src={displayPhotoSrc}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.log("[v0] Image load error, using fallback")
                          // e.target.src = "/abstract-profile.png"
                        }}
                        onLoad={() => {
                          console.log("[v0] Image loaded successfully:", previewPhoto ? "preview" : "server URL")
                        }}
                      />
                    </div>
                    {/* Delete button below photo */}
                    <div className="text-center mt-2">
                      <button
                        onClick={handleDeletePhoto}
                        className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
                      >
                        Remove Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mb-4">
                    <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300 mx-auto">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                    <p className="text-center text-sm text-gray-500 mt-2">No photo uploaded</p>
                  </div>
                )}

                {/* File upload input */}
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, "profilePhoto")}
                    className="block w-full text-base text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-base file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="text-sm text-gray-500 mt-1">Max size: 5MB. Supported: JPG, PNG, GIF</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2 text-left">First Name *</label>
                  <input
                    type="text"
                    value={profileData.basicInfo.firstName}
                    onChange={(e) => handleInputChange("basicInfo", "firstName", e.target.value)}
                    className={`w-full p-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gradient-to-r from-blue-50 to-white text-base ${
                      errors.firstName ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                </div>

                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2 text-left">Last Name *</label>
                  <input
                    type="text"
                    value={profileData.basicInfo.lastName}
                    onChange={(e) => handleInputChange("basicInfo", "lastName", e.target.value)}
                    className={`w-full p-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gradient-to-r from-blue-50 to-white text-base ${
                      errors.lastName ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                </div>

                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2 text-left">Email *</label>
                  <input
                    type="email"
                    value={profileData.basicInfo.email}
                    onChange={(e) => handleInputChange("basicInfo", "email", e.target.value)}
                    className={`w-full p-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gradient-to-r from-blue-50 to-white text-base ${
                      errors.email ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2 text-left">Phone *</label>
                  <input
                    type="tel"
                    value={profileData.basicInfo.phone}
                    onChange={(e) => handleInputChange("basicInfo", "phone", e.target.value)}
                    className={`w-full p-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gradient-to-r from-blue-50 to-white text-base ${
                      errors.phone ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                </div>

                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2 text-left">City *</label>
                  <input
                    type="text"
                    value={profileData.basicInfo.city}
                    onChange={(e) => handleInputChange("basicInfo", "city", e.target.value)}
                    className={`w-full p-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gradient-to-r from-blue-50 to-white text-base ${
                      errors.city ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                </div>

                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2 text-left">State *</label>
                  <input
                    type="text"
                    value={profileData.basicInfo.state}
                    onChange={(e) => handleInputChange("basicInfo", "state", e.target.value)}
                    className={`w-full p-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gradient-to-r from-blue-50 to-white text-base ${
                      errors.state ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
                </div>

                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2 text-left">Country *</label>
                  <input
                    type="text"
                    value={profileData.basicInfo.country}
                    onChange={(e) => handleInputChange("basicInfo", "country", e.target.value)}
                    className={`w-full p-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gradient-to-r from-blue-50 to-white text-base ${
                      errors.country ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.country && <p className="text-red-500 text-sm mt-1">{errors.country}</p>}
                </div>

                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2 text-left">
                    Preferred Location *
                  </label>
                  <input
                    type="text"
                    value={profileData.basicInfo.preferredLocation}
                    onChange={(e) => handleInputChange("basicInfo", "preferredLocation", e.target.value)}
                    className={`w-full p-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gradient-to-r from-blue-50 to-white text-base ${
                      errors.preferredLocation ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.preferredLocation && <p className="text-red-500 text-sm mt-1">{errors.preferredLocation}</p>}
                </div>

                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2 text-left">Age *</label>
                  <input
                    type="number"
                    value={profileData.basicInfo.age}
                    onChange={(e) => handleInputChange("basicInfo", "age", e.target.value)}
                    className={`w-full p-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gradient-to-r from-blue-50 to-white text-base ${
                      errors.age ? "border-red-500" : "border-gray-300"
                    }`}
                    min="1"
                    max="120"
                  />
                  {errors.age && <p className="text-red-500 text-sm mt-1">{errors.age}</p>}
                </div>

                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2 text-left">Gender *</label>
                  <select
                    value={profileData.basicInfo.gender}
                    onChange={(e) => handleInputChange("basicInfo", "gender", e.target.value)}
                    className={`w-full p-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gradient-to-r from-blue-50 to-white text-base ${
                      errors.gender ? "border-red-500" : "border-gray-300"
                    }`}
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                  {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender}</p>}
                </div>

                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2 text-left">Job Type *</label>
                  <select
                    value={profileData.basicInfo.jobType}
                    onChange={(e) => handleInputChange("basicInfo", "jobType", e.target.value)}
                    className={`w-full p-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gradient-to-r from-blue-50 to-white text-base ${
                      errors.jobType ? "border-red-500" : "border-gray-300"
                    }`}
                  >
                    <option value="">Select job type</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Freelance">Freelance</option>
                    <option value="Internship">Internship</option>
                  </select>
                  {errors.jobType && <p className="text-red-500 text-sm mt-1">{errors.jobType}</p>}
                </div>

                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2 text-left">Expected Salary/Stipend *</label>
                  <input
                    type="text"
                    value={profileData.basicInfo.expectedSalary}
                    onChange={(e) => handleInputChange("basicInfo", "expectedSalary", e.target.value)}
                    className={`w-full p-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gradient-to-r from-blue-50 to-white text-base ${
                      errors.expectedSalary ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.expectedSalary && <p className="text-red-500 text-sm mt-1">{errors.expectedSalary}</p>}
                </div>
              </div>
            </div>

            {/* Profile Summary */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <svg className="w-6 h-6 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Profile Summary
              </h2>

              <div>
                <label className="block text-base font-semibold text-gray-700 mb-2">Professional Summary</label>
                <textarea
                  value={profileData.profileSummary}
                  onChange={(e) => setProfileData((prev) => ({ ...prev, profileSummary: e.target.value }))}
                  rows={6}
                  className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gradient-to-r from-blue-50 to-white text-base"
                  placeholder="Write a brief summary about yourself, your experience, and career objectives..."
                />
              </div>
            </div>
          </div>

          {/* Right Column - Action Cards */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate("/education")}
                  className="w-full flex items-center justify-between p-4 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors group"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-3 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
                      />
                    </svg>
                    <span className="font-semibold text-base">Education</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-base text-gray-500 mr-2">
                      {typeof counts.education === "number" ? counts.education : (profileData.education || []).length}{" "}
                      entries
                    </span>
                    <svg
                      className="w-4 h-4 text-gray-400 group-hover:text-teal-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>

                <button
                  onClick={() => navigate("/skills")}
                  className="w-full flex items-center justify-between p-4 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors group"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-3 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 3v4M3 7h4m0 0V3m0 4a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2zm10 4a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6a2 2 0 012-2h6z"
                      />
                    </svg>
                    <span className="font-semibold text-base">Skills</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-base text-gray-500 mr-2">
                      {typeof counts.skills === "number" ? counts.skills : (profileData.skills || []).length} skills
                    </span>
                    <svg
                      className="w-4 h-4 text-gray-400 group-hover:text-yellow-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>

                <button
                  onClick={() => navigate("/languages")}
                  className="w-full flex items-center justify-between p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 14l9-5-9-5-9 5 9 5zm0 0v12"
                      />
                    </svg>
                    <span className="font-semibold text-base">Languages</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-base text-gray-500 mr-2">
                      {typeof counts.languages === "number" ? counts.languages : (profileData.languages || []).length}{" "}
                      languages
                    </span>
                    <svg
                      className="w-4 h-4 text-gray-400 group-hover:text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>

                <button
                  onClick={() => navigate("/internships")}
                  className="w-full flex items-center justify-between p-4 bg-red-50 hover:bg-red-100 rounded-lg transition-colors group"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 14v1a3 3 0 01-3 3H3a3 3 0 01-3-3V6a3 3 0 013-3h3m0 18c-2.97 0-5.464-2.055-6.33-4.977a1 1 0 01.585-1.21l.774-.309a1 1 0 00.774-.309l1.555-1.273a1 1 0 00.258-.759l.144-1.154a1 1 0 00-.258-.758l-1.555-1.273a1 1 0 00-.774-.309H3a1 1 0 00-1 .759l-.144 1.154a1 1 0 00.258.758l1.555 1.273a1 1 0 00.774.309h.774a1 1 0 00.585 1.21C3.665 19.945 6.15 22 9 22h6a3 3 0 003-3v-1m0 0-3-3m3 3-3 3"
                      />
                    </svg>
                    <span className="font-semibold text-base">Internships</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-base text-gray-500 mr-2">
                      {typeof counts.internships === "number"
                        ? counts.internships
                        : (profileData.internships || []).length}{" "}
                      entries
                    </span>
                    <svg
                      className="w-4 h-4 text-gray-400 group-hover:text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>

                <button
                  onClick={() => navigate("/projects")}
                  className="w-full flex items-center justify-between p-4 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors group"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    <span className="font-semibold text-base">Projects</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-base text-gray-500 mr-2">
                      {typeof counts.projects === "number" ? counts.projects : (profileData.projects || []).length}{" "}
                      projects
                    </span>
                    <svg
                      className="w-4 h-4 text-gray-400 group-hover:text-indigo-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>

                <button
                  onClick={() => navigate("/employment")}
                  className="w-full flex items-center justify-between p-4 bg-pink-50 hover:bg-pink-100 rounded-lg transition-colors group"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-3 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2h-1a2 2 0 00-2 2v16a2 2 0 002 2h1a2 2 0 002-2zM9 21V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16a2 2 0 002 2h1a2 2 0 002-2z"
                      />
                    </svg>
                    <span className="font-semibold text-base">Employment</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-base text-gray-500 mr-2">
                      {typeof counts.employment === "number"
                        ? counts.employment
                        : (profileData.employment || []).length}{" "}
                      entries
                    </span>
                    <svg
                      className="w-4 h-4 text-gray-400 group-hover:text-pink-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>

                <button
                  onClick={() => navigate("/accomplishments")}
                  className="w-full flex items-center justify-between p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors group"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM16 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM16 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                      />
                    </svg>
                    <span className="font-semibold text-base">Accomplishments</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-base text-gray-500 mr-2">
                      {counts.accomplishments?.total ??
                        (profileData.accomplishments?.certifications || []).length +
                          (profileData.accomplishments?.awards || []).length +
                          (profileData.accomplishments?.clubsCommittees || []).length}{" "}
                      items
                    </span>
                    <svg
                      className="w-4 h-4 text-gray-400 group-hover:text-orange-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Resume Upload</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-base font-semibold text-gray-700 mb-2">Upload Resume (PDF, Word .doc/.docx)</label>

                  {/* Resume preview section */}
                  {profileData.resume.url ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h5 className="text-lg font-semibold text-gray-900">Resume</h5>
                        <div className="flex space-x-2">
                          <button
                            onClick={handlePreviewResume}
                            className="inline-flex items-center px-4 py-2 bg-blue-500 text-white text-sm font-semibold rounded hover:bg-blue-600 transition-all duration-200"
                          >
                            Preview
                          </button>
                          <button
                            onClick={handleDownloadResume}
                            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download Resume
                          </button>
                        </div>
                      </div>
                      {/* Delete button */}
                      <div className="flex justify-end">
                        <button
                          onClick={handleDeleteResume}
                          className="px-4 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors flex items-center"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                      <svg
                        className="w-12 h-12 text-gray-400 mx-auto mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                      <p className="text-gray-500 text-base">No resume uploaded</p>
                    </div>
                  )}

                  <input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => handleFileUpload(e, "resume")}
                    className="block w-full text-base text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-base file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="text-sm text-gray-500 mt-1">Max size: 10MB. PDF files only</p>
                </div>
              </div>
            </div>

            {/* Generate PDF */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
              <h3 className="text-2xl font-bold text-white mb-4">Generate Resume</h3>
              <p className="text-blue-50 mb-4">Create a professional PDF resume from your profile data</p>
              <button
                onClick={generatePDF}
                className="w-full bg-white text-blue-600 font-semibold py-3 px-6 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Download PDF Resume
              </button>
            </div>
          </div>
        </div>

        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={handleSaveProfile}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-lg flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Save Your Profile</span>
          </button>
        </div>

        {/* Resume Preview Modal */}
        {showResumeModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center p-4 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900">Resume Preview</h3>
                <button
                  onClick={() => setShowResumeModal(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 rounded hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-auto">
                {fullResumeUrl && !fullResumeUrl.includes('.doc') && !fullResumeUrl.includes('.docx') ? (
                  <iframe
                    src={`${API_BASE_URL}/download?url=${encodeURIComponent(fullResumeUrl)}#toolbar=0&navpanes=0&scrollbar=0`}
                    width="100%"
                    height="800"
                    title="Resume Preview"
                    onError={handleResumeLoadError}
                    className="w-full border-0"
                  />
                ) : (
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-dashed border-blue-300 rounded-lg p-8 text-center h-full flex flex-col items-center justify-center">
                    <FileText className="w-16 h-16 text-blue-400 mb-4" />
                    <p className="text-blue-700 text-base font-medium">Word Document Resume</p>
                    <p className="text-blue-600 text-sm mt-2 mb-6">Preview not available for Word documents.</p>
                    <button
                      onClick={handleDownloadResume}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download to View
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Confirm Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-md" onClick={handleConfirmNo} />
            <div className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">{confirmTitle}</h2>
                <button
                  onClick={handleConfirmNo}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6">
                <p className="text-gray-600 mb-6">{confirmMessage}</p>
                <div className="flex space-x-2">
                  <button
                    onClick={handleConfirmNo}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmYes}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-semibold transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Alert Modal */}
        {showAlertModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-md" onClick={closeAlert} />
            <div className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl">
              <div className="p-6 text-center">
                {alertType === 'success' ? (
                  <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
                ) : (
                  <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
                )}
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {alertType === 'success' ? 'Success!' : 'Error!'}
                </h2>
                <p className="text-gray-600 mb-6">{alertMessage}</p>
                <button
                  onClick={closeAlert}
                  className={`w-full py-2 rounded-lg font-semibold transition-colors ${
                    alertType === 'success'
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-gray-500 hover:bg-gray-600 text-white'
                  }`}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Profile