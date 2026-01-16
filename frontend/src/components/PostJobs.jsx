"use client"

import { useState, useMemo } from "react"
import {
  Building2,
  MapPin,
  Users,
  GraduationCap,
  Languages,
  FileText,
  Award,
  Save,
  Eye,
  X,
  Plus,
} from "lucide-react"

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

// Comprehensive skill database with job title to skills mapping
const skillDatabase = {
  // Tech/Developer Positions
  "frontend developer": ["React", "Vue.js", "Angular", "JavaScript", "TypeScript", "HTML", "CSS", "Tailwind CSS", "Bootstrap", "Responsive Design", "Next.js", "Redux", "Webpack", "Babel"],
  "backend developer": ["Node.js", "Python", "Java", "C#", "SQL", "MongoDB", "Express.js", "Django", "Spring Boot", "REST API", "GraphQL", "Docker", "Microservices"],
  "full stack developer": ["React", "Node.js", "JavaScript", "TypeScript", "MongoDB", "SQL", "Express.js", "HTML", "CSS", "REST API", "Docker", "Git", "AWS"],
  "react developer": ["React", "JavaScript", "TypeScript", "HTML", "CSS", "Redux", "Next.js", "Hooks", "State Management", "Responsive Design", "Jest", "React Router"],
  "java developer": ["Java", "Spring Boot", "SQL", "Hibernate", "Maven", "JUnit", "JDBC", "Multithreading", "Collections", "OOP", "Gradle", "Microservices"],
  "python developer": ["Python", "Django", "Flask", "FastAPI", "SQL", "Pandas", "NumPy", "REST API", "ORM", "Web Development", "Requests", "SQLAlchemy"],
  "mobile developer": ["React Native", "Flutter", "Kotlin", "Swift", "Java", "UI/UX", "Firebase", "REST API", "Git", "Mobile Testing", "Xcode", "Android Studio"],
  "ios developer": ["Swift", "Objective-C", "Xcode", "iOS SDK", "CocoaPods", "Unit Testing", "UI Kit", "SwiftUI", "Cocoa", "Push Notifications"],
  "android developer": ["Kotlin", "Java", "Android Studio", "Android SDK", "Material Design", "Gradle", "Firebase", "SQLite", "REST API", "XML"],
  "software engineer": ["Java", "Python", "JavaScript", "C++", "System Design", "Algorithms", "Data Structures", "OOP", "Design Patterns", "Testing", "Git"],
  
  // Data & Analytics Positions
  "data scientist": ["Python", "R", "Machine Learning", "TensorFlow", "Pandas", "NumPy", "SQL", "Data Analysis", "Tableau", "Statistical Analysis", "Scikit-learn", "Jupyter"],
  "data analyst": ["SQL", "Python", "R", "Tableau", "Power BI", "Excel", "Data Visualization", "Statistics", "Google Analytics", "Data Cleaning", "Business Intelligence"],
  "data engineer": ["Python", "SQL", "Apache Spark", "Hadoop", "ETL", "Data Warehousing", "Snowflake", "BigQuery", "Airflow", "AWS", "Scala"],
  "ml engineer": ["Python", "Machine Learning", "TensorFlow", "PyTorch", "Scikit-learn", "Deep Learning", "Neural Networks", "NLP", "Computer Vision", "MLOps"],
  
  // DevOps & Infrastructure
  "devops engineer": ["Docker", "Kubernetes", "AWS", "Azure", "CI/CD", "Jenkins", "Git", "Linux", "Terraform", "Ansible", "GitHub Actions", "GitLab CI"],
  "cloud engineer": ["AWS", "Azure", "Google Cloud", "Docker", "Kubernetes", "Infrastructure as Code", "Terraform", "CloudFormation", "CI/CD", "Networking"],
  "platform engineer": ["Kubernetes", "Docker", "CI/CD", "Terraform", "AWS", "Azure", "Monitoring", "Logging", "Infrastructure as Code", "System Architecture"],
  "infrastructure engineer": ["Linux", "AWS", "Terraform", "Ansible", "Networking", "Security", "Virtualization", "Cloud Computing", "System Administration", "Database Management"],
  "network engineer": ["Networking", "Cisco", "Firewalls", "VPN", "BGP", "OSPF", "TCP/IP", "Network Security", "Load Balancing", "DNS"],
  
  // Design Positions
  "ui/ux designer": ["Figma", "Adobe XD", "UI Design", "UX Design", "Prototyping", "User Research", "Wireframing", "Design Systems", "Sketch", "CSS", "Adobe Photoshop"],
  "graphic designer": ["Adobe Photoshop", "Adobe Illustrator", "InDesign", "Figma", "Design Principles", "Typography", "Color Theory", "Brand Design", "Visual Design", "Canva"],
  "web designer": ["Figma", "Adobe XD", "HTML", "CSS", "JavaScript", "Responsive Design", "User Experience", "Wireframing", "Prototyping", "Design Systems"],
  "interaction designer": ["Figma", "Adobe XD", "User Research", "Prototyping", "Animation", "Microinteractions", "User Testing", "Design Thinking", "Usability"],
  
  // Management & Leadership
  "product manager": ["Product Strategy", "Analytics", "Roadmapping", "User Research", "Agile", "Data Analysis", "Communication", "Leadership", "Market Research", "OKRs", "Jira"],
  "project manager": ["Project Management", "Agile", "Scrum", "Kanban", "Leadership", "Communication", "Risk Management", "Budget Management", "JIRA", "Microsoft Project"],
  "scrum master": ["Scrum", "Agile", "Team Leadership", "Facilitation", "Conflict Resolution", "Kanban", "Sprint Planning", "Retrospectives", "Backlog Management"],
  "engineering manager": ["Leadership", "Team Management", "Technical Knowledge", "Communication", "Performance Management", "Strategic Planning", "Hiring", "Mentoring", "Agile"],
  "technical lead": ["System Design", "Technical Leadership", "Code Review", "Mentoring", "Architecture", "Problem Solving", "Communication", "Decision Making", "Best Practices"],
  
  // Quality Assurance
  "qa engineer": ["Selenium", "Testing", "Automation", "JIRA", "Bug Tracking", "Manual Testing", "API Testing", "Postman", "Load Testing", "Quality Assurance", "Jest", "Cypress"],
  "test automation engineer": ["Selenium", "Cypress", "Appium", "JUnit", "TestNG", "Automation Scripting", "Framework Development", "Load Testing", "Performance Testing", "CI/CD"],
  "quality assurance analyst": ["Manual Testing", "Test Planning", "Bug Tracking", "Quality Assurance", "JIRA", "Test Documentation", "Regression Testing", "User Acceptance Testing"],
  
  // Marketing & Business
  "marketing manager": ["Marketing Strategy", "SEO", "SEM", "Social Media", "Content Marketing", "Analytics", "Google Analytics", "Copywriting", "Brand Strategy", "Campaign Management"],
  "content marketing manager": ["Content Strategy", "Copywriting", "SEO", "Content Creation", "Blogging", "Social Media", "Analytics", "Email Marketing", "Brand Voice"],
  "digital marketing specialist": ["SEO", "SEM", "Social Media Marketing", "Google Analytics", "PPC", "Email Marketing", "Content Marketing", "Marketing Automation", "A/B Testing"],
  "seo specialist": ["SEO", "Keyword Research", "On-page Optimization", "Off-page Optimization", "Technical SEO", "Analytics", "Google Search Console", "Link Building", "Content Optimization"],
  "social media manager": ["Social Media Marketing", "Content Creation", "Community Management", "Analytics", "Instagram", "Facebook", "Twitter", "LinkedIn", "Engagement Strategy"],
  
  // Sales & Customer Success
  "sales manager": ["Sales Strategy", "CRM", "Negotiation", "Communication", "Leadership", "Client Management", "Pipeline Management", "Forecasting", "Salesforce", "Account Management"],
  "business development manager": ["Business Development", "Networking", "Relationship Building", "Negotiation", "Sales", "Market Research", "Communication", "Strategy", "Sales Pipeline"],
  "account executive": ["Sales", "CRM", "Negotiation", "Client Management", "Relationship Building", "Communication", "Sales Pipeline", "Forecasting", "Closing Deals"],
  "customer success manager": ["Customer Management", "Communication", "Problem Solving", "Relationship Building", "Account Management", "Product Knowledge", "Retention", "Upselling"],
  "sales representative": ["Sales", "Communication", "Negotiation", "CRM", "Customer Service", "Prospecting", "Lead Generation", "Closing", "Relationship Building"],
  
  // System & Database Administration
  "system admin": ["Linux", "Windows Server", "Networking", "Security", "Cloud", "AWS", "Active Directory", "DNS", "Firewall", "Troubleshooting", "System Administration"],
  "database administrator": ["SQL", "Database Design", "Performance Tuning", "Backup & Recovery", "Security", "MySQL", "PostgreSQL", "MongoDB", "Replication", "Query Optimization"],
  "security engineer": ["Cybersecurity", "Network Security", "Penetration Testing", "Firewalls", "Encryption", "Security Protocols", "Threat Analysis", "Vulnerability Assessment"],
  "security analyst": ["Security", "Threat Analysis", "Vulnerability Assessment", "SIEM", "Intrusion Detection", "Compliance", "Risk Assessment", "Incident Response"],
  
  // Specialized Tech
  "machine learning engineer": ["Python", "Machine Learning", "TensorFlow", "PyTorch", "Deep Learning", "Neural Networks", "NLP", "Computer Vision", "MLOps", "Data Processing"],
  "ai engineer": ["Artificial Intelligence", "Machine Learning", "Deep Learning", "NLP", "Computer Vision", "TensorFlow", "PyTorch", "Large Language Models", "AI Ethics"],
  "blockchain developer": ["Blockchain", "Solidity", "Web3", "Smart Contracts", "Cryptocurrency", "Ethereum", "Bitcoin", "Decentralized Applications", "Cryptography"],
  "ar/vr developer": ["Unity", "Unreal Engine", "C#", "C++", "AR Development", "VR Development", "3D Graphics", "Spatial Computing", "Game Development"],
  "game developer": ["Unity", "Unreal Engine", "C#", "C++", "Game Programming", "Physics", "Graphics", "Audio", "Multiplayer Networking", "Game Design"],
  
  // Consulting & Strategy
  "management consultant": ["Strategic Planning", "Business Analysis", "Problem Solving", "Communication", "Research", "Presentation Skills", "Data Analysis", "Change Management"],
  "business analyst": ["Business Analysis", "Requirements Gathering", "Process Improvement", "Data Analysis", "Communication", "Documentation", "Project Management", "Testing"],
  "solutions architect": ["System Design", "Architecture", "Technical Leadership", "Cloud Services", "Communication", "Problem Solving", "Technical Knowledge", "Best Practices"],
  "technical architect": ["System Design", "Architecture", "Technical Leadership", "Infrastructure", "Scalability", "Performance", "Security", "Technology Stack Selection"],
  
  // Operations
  "operations manager": ["Operations Management", "Process Improvement", "Leadership", "Communication", "Planning", "Budgeting", "Team Management", "Problem Solving"],
  "business operations analyst": ["Business Analysis", "Process Improvement", "Data Analysis", "Excel", "Documentation", "Reporting", "Problem Solving", "Communication"],
  
  // HR & People
  "hr manager": ["Recruitment", "Employee Relations", "Performance Management", "Compensation", "Benefits", "Training", "Leadership", "Communication", "Policy Development"],
  "recruiter": ["Recruitment", "Sourcing", "Interviewing", "Communication", "Relationship Building", "Job Matching", "LinkedIn", "Networking", "Negotiation"],
  "talent acquisition specialist": ["Recruitment", "Talent Sourcing", "Interviewing", "Job Posting", "LinkedIn Recruiting", "Candidate Assessment", "Relationship Building"],
}

// Get all unique skills from database for fallback
const allSkills = Array.from(new Set(Object.values(skillDatabase).flat())).sort()

const PostJobs = () => {
  const [formData, setFormData] = useState({
    postingAs: "company",
    consultancyHiringFor: "",
    companyName: "",
    jobTitle: "",
    jobLocation: "",
    jobType: [],
    skills: [],
    skillInput: "",
    education: "",
    languages: "",
    payMin: "",
    payMax: "",
    jobDescription: "",
    workExperience: "",
    responsibilities: "",
    benefits: "",
    aboutCompany: "",
    // companyInfo REMOVED
  })

  const [showPreview, setShowPreview] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false)

  // Get suggested skills based on job title and skill input
  const suggestedSkills = useMemo(() => {
    // Get skills for the job title
    const jobTitleLower = formData.jobTitle.toLowerCase().trim()
    let skillsForTitle = []
    
    // Check for exact or partial matches in job title
    for (const [title, skills] of Object.entries(skillDatabase)) {
      if (jobTitleLower.includes(title) || title.includes(jobTitleLower)) {
        skillsForTitle = [...new Set([...skillsForTitle, ...skills])]
      }
    }
    
    // If no job title match, use all skills
    if (skillsForTitle.length === 0) {
      skillsForTitle = allSkills
    }
    
    // Filter by skill input text (case-insensitive)
    const inputLower = formData.skillInput.toLowerCase().trim()
    let filtered = skillsForTitle
    
    if (inputLower) {
      filtered = skillsForTitle.filter(skill => 
        skill.toLowerCase().includes(inputLower)
      )
    }
    
    // Remove already selected skills
    return filtered.filter(skill => !formData.skills.includes(skill))
  }, [formData.jobTitle, formData.skillInput, formData.skills])

  const jobTypeOptions = [
    "Full-time",
    "Part-time",
    "Contract",
    "Internship",
    "Remote",
    "Fresher",
    "Freelance",
    "Temporary",
  ]

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleAddSkill = (skill) => {
    if (skill.trim() && !formData.skills.includes(skill.trim())) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, skill.trim()],
        skillInput: "",
      }))
      setShowSkillSuggestions(false)
    }
  }

  const handleRemoveSkill = (skillToRemove) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove),
    }))
  }

  const handleSkillInputChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      skillInput: value,
    }))
  }

  const handleKeyDownSkill = (e) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddSkill(formData.skillInput)
    }
  }

  const handleJobTypeChange = (type) => {
    setFormData((prev) => {
      const jobTypes = prev.jobType.includes(type)
        ? prev.jobType.filter((t) => t !== type)
        : [...prev.jobType, type]
      return { ...prev, jobType: jobTypes }
    })
  }

  const validateForm = () => {
    const errors = [];
    if (isNaN(Number(formData.payMin)) && formData.payMin !== "") {
      errors.push("payMin must be a valid number");
    }
    if (isNaN(Number(formData.payMax)) && formData.payMax !== "") {
      errors.push("payMax must be a valid number");
    }
    return errors;
  };

  const handleSubmit = async () => {
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      alert("Validation errors: " + validationErrors.join(", "));
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No authentication token found. Please log in.");

      const response = await fetch(`${API_BASE_URL}/api/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          skills: formData.skills.join(", "), // Convert array to comma-separated string for backend
        }),
      });

      const responseText = await response.text();
      let data;
      try { data = JSON.parse(responseText); } catch { throw new Error("Invalid response from server"); }

      if (response.ok) {
        alert("Job posted successfully! Job ID: " + data.jobId);
        setFormData({
          postingAs: "company",
          consultancyHiringFor: "",
          companyName: "",
          jobTitle: "",
          jobLocation: "",
          jobType: [],
          skills: [],
          skillInput: "",
          education: "",
          languages: "",
          payMin: "",
          payMax: "",
          jobDescription: "",
          workExperience: "",
          responsibilities: "",
          benefits: "",
          aboutCompany: "",
        });
      } else {
        alert("Failed to post job: " + (data.errors?.join(", ") || data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Network error:", error);
      alert("Network error occurred: " + error.message);
    }
    setIsLoading(false);
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <section className="bg-gradient-to-br from-blue-50 to-white py-12">
        <div className="w-full px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-700 mb-4 text-center">
              Post a <span className="text-blue-800">Job</span>
            </h1>
            <p className="text-lg text-gray-600 text-center">
              Find the perfect candidate for your team with our comprehensive job posting platform
            </p>
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="py-16">
        <div className="w-full px-4">
          <div className="max-w-4xl mx-auto">
            {!showPreview ? (
              <form className="space-y-8">

                {/* ───── Job Details ───── */}
                <div className="bg-blue-50 rounded-lg p-8 border border-gray-200 shadow-sm">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-3 bg-blue-800 rounded-lg">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-700 text-left">Job Details</h2>
                  </div>

                  <div className="space-y-6">

                    {/* Posting As */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3 text-left">
                        You're posting this job as a:
                      </label>
                      <div className="flex space-x-4">
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            value="company"
                            checked={formData.postingAs === "company"}
                            onChange={(e) => handleInputChange("postingAs", e.target.value)}
                            className="text-blue-800 focus:ring-blue-500"
                          />
                          <span className="text-gray-700">Company / Business</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            value="consultancy"
                            checked={formData.postingAs === "consultancy"}
                            onChange={(e) => handleInputChange("postingAs", e.target.value)}
                            className="text-blue-800 focus:ring-blue-500"
                          />
                          <span className="text-gray-700">Consultancy</span>
                        </label>
                      </div>
                    </div>

                    {/* Consultancy Hiring For */}
                    {formData.postingAs === "consultancy" && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 text-left">
                          Company you are hiring for *
                        </label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 w-4 h-4" />
                          <input
                            type="text"
                            value={formData.consultancyHiringFor}
                            onChange={(e) => handleInputChange("consultancyHiringFor", e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                            placeholder="Enter company name you're hiring for"
                          />
                        </div>
                      </div>
                    )}

                    {/* Company / Consultancy Name (optional) */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 text-left">
                        Your {formData.postingAs === "consultancy" ? "Consultancy" : "Company"} Name
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 w-4 h-4" />
                        <input
                          type="text"
                          value={formData.companyName}
                          onChange={(e) => handleInputChange("companyName", e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                          placeholder={`Enter your ${formData.postingAs === "consultancy" ? "consultancy" : "company"} name (optional)`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Job Title */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 text-left">Job Title *</label>
                        <div className="relative">
                          <Award className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 w-4 h-4" />
                          <input
                            type="text"
                            value={formData.jobTitle}
                            onChange={(e) => handleInputChange("jobTitle", e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                            placeholder="e.g., Senior Frontend Developer"
                          />
                        </div>
                      </div>

                      {/* Job Location */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 text-left">Job Location *</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 w-4 h-4" />
                          <input
                            type="text"
                            value={formData.jobLocation}
                            onChange={(e) => handleInputChange("jobLocation", e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                            placeholder="e.g., San Francisco, CA or Remote"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Job Type */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 text-left">Job Type *</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {jobTypeOptions.map((type) => (
                          <label key={type} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              value={type}
                              checked={formData.jobType.includes(type)}
                              onChange={() => handleJobTypeChange(type)}
                              className="text-blue-800 focus:ring-blue-500"
                            />
                            <span className="text-gray-700">{type}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ───── Requirements ───── */}
                <div className="bg-blue-50 rounded-lg p-8 border border-gray-200 shadow-sm">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-3 bg-blue-800 rounded-lg">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-700 text-left">Requirements</h2>
                  </div>

                  <div className="space-y-6">
                    {/* Skills */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 text-left">Skills *</label>
                      
                      {/* Selected Skills Tags */}
                      {formData.skills.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-2">
                          {formData.skills.map((skill, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                            >
                              {skill}
                              <button
                                type="button"
                                onClick={() => handleRemoveSkill(skill)}
                                className="hover:text-blue-900 ml-1"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Skill Input with Suggestions */}
                      <div className="relative">
                        <Award className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 w-4 h-4 pointer-events-none" />
                        <input
                          type="text"
                          value={formData.skillInput}
                          onChange={(e) => handleSkillInputChange(e.target.value)}
                          onKeyDown={handleKeyDownSkill}
                          onFocus={() => setShowSkillSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowSkillSuggestions(false), 200)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                          placeholder="Type skill name or select from suggestions..."
                        />
                        
                        {/* Suggested Skills Dropdown */}
                        {showSkillSuggestions && (suggestedSkills.length > 0 || formData.skillInput) && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                            {suggestedSkills.length > 0 && (
                              <>
                                <div className="px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-50">Suggested Skills</div>
                                {suggestedSkills.map((skill) => (
                                  <button
                                    key={skill}
                                    type="button"
                                    onClick={() => handleAddSkill(skill)}
                                    className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0"
                                  >
                                    <span className="text-sm text-gray-700">{skill}</span>
                                  </button>
                                ))}
                              </>
                            )}
                            
                            {formData.skillInput.trim() && !suggestedSkills.includes(formData.skillInput.trim()) && (
                              <>
                                <div className="px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-50">Add Custom</div>
                                <button
                                  type="button"
                                  onClick={() => handleAddSkill(formData.skillInput)}
                                  className="w-full text-left px-4 py-2 hover:bg-green-50 flex items-center gap-2"
                                >
                                  <Plus className="w-4 h-4 text-green-600" />
                                  <span className="text-sm text-gray-700">Add "{formData.skillInput.trim()}"</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Education */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 text-left">Education *</label>
                      <div className="relative">
                        <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 w-4 h-4" />
                        <textarea
                          value={formData.education}
                          onChange={(e) => handleInputChange("education", e.target.value)}
                          rows={4}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                          placeholder="KEEP COMMA SEPARATED e.g., BSC, MSC..."
                        />
                      </div>
                    </div>

                    {/* Languages */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 text-left">Languages</label>
                      <div className="relative">
                        <Languages className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 w-4 h-4" />
                        <textarea
                          value={formData.languages}
                          onChange={(e) => handleInputChange("languages", e.target.value)}
                          rows={4}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                          placeholder="e.g., English (Native), Spanish (Professional)..."
                        />
                      </div>
                    </div>

                    {/* Pay Range */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 text-left">Pay Range *</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 text-lg">₹</span>
                          <input
                            type="text"
                            value={formData.payMin}
                            onChange={(e) => handleInputChange("payMin", e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                            placeholder="Minimum salary (e.g., 800000)"
                          />
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 text-lg">₹</span>
                          <input
                            type="text"
                            value={formData.payMax}
                            onChange={(e) => handleInputChange("payMax", e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                            placeholder="Maximum salary (e.g., 1200000)"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ───── Job Description ───── */}
                <div className="bg-blue-50 rounded-lg p-8 border border-gray-200 shadow-sm">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-3 bg-blue-800 rounded-lg">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-700 text-left">Job Description</h2>
                  </div>

                  <div className="space-y-6">
                    {/* Job Description */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 text-left">Job Description *</label>
                      <textarea
                        value={formData.jobDescription}
                        onChange={(e) => handleInputChange("jobDescription", e.target.value)}
                        rows={6}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        placeholder="Describe the role, company culture..."
                      />
                    </div>

                    {/* Work Experience */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 text-left">
                        Work Experience Required *
                      </label>
                      <textarea
                        value={formData.workExperience}
                        onChange={(e) => handleInputChange("workExperience", e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        placeholder="Specify required experience..."
                      />
                    </div>

                    {/* Responsibilities */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 text-left">Responsibilities *</label>
                      <textarea
                        value={formData.responsibilities}
                        onChange={(e) => handleInputChange("responsibilities", e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        placeholder="List key responsibilities..."
                      />
                    </div>

                    {/* Benefits */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 text-left">Benefits</label>
                      <textarea
                        value={formData.benefits}
                        onChange={(e) => handleInputChange("benefits", e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        placeholder="List benefits offered..."
                      />
                    </div>

                    {/* About Company */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2 text-left">About Company</label>
                      <textarea
                        value={formData.aboutCompany}
                        onChange={(e) => handleInputChange("aboutCompany", e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                        placeholder="Describe your company, mission, values..."
                      />
                    </div>

                    {/* COMPANY INFO REMOVED – no textarea here */}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4 pt-6">
                  <button
                    type="button"
                    onClick={() => setShowPreview(true)}
                    className="px-8 py-3 border border-blue-800 text-blue-800 rounded-lg hover:bg-blue-50 transition-colors inline-flex items-center space-x-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Preview Job Post</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="px-8 py-3 bg-blue-800 text-white rounded-lg hover:bg-blue-900 disabled:bg-blue-400 transition-colors inline-flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isLoading ? "Posting..." : "Post Job"}</span>
                  </button>
                </div>
              </form>
            ) : (
              /* ───── Preview ───── */
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-700 text-left">Job Post Preview</h2>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back to Edit
                  </button>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
                  <div className="space-y-6">
                    {/* Title + Company + Location */}
                    <div className="border-b border-gray-200 pb-6">
                      <h1 className="text-3xl font-bold text-gray-700 mb-2 text-left">{formData.jobTitle}</h1>
                      <div className="flex items-center space-x-4 text-gray-600 mb-4">
                        {formData.companyName && (
                          <div className="flex items-center space-x-1">
                            <Building2 className="w-4 h-4" />
                            <span>{formData.companyName}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-4 h-4" />
                          <span>{formData.jobLocation}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.jobType.map((t, i) => (
                          <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">{t}</span>
                        ))}
                        {formData.payMin && formData.payMax && (
                          <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                            ₹{formData.payMin} - ₹{formData.payMax}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Skills */}
                    {formData.skills && formData.skills.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-3 text-left">Skills Required</h3>
                        <div className="flex flex-wrap gap-2">
                          {formData.skills.map((s, i) => (
                            <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                              {s.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Education */}
                    {formData.education && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-3 text-left">Education</h3>
                        <p className="text-gray-600">{formData.education}</p>
                      </div>
                    )}

                    {/* Languages */}
                    {formData.languages && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-3 text-left">Languages</h3>
                        <div className="flex flex-wrap gap-2">
                          {formData.languages.split(",").map((l, i) => (
                            <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                              {l.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Job Description */}
                    {formData.jobDescription && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-3 text-left">Job Description</h3>
                        <p className="text-gray-600 leading-relaxed whitespace-pre-wrap break-words">{formData.jobDescription}</p>
                      </div>
                    )}

                    {/* Work Experience */}
                    {formData.workExperience && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-3 text-left">Work Experience Required</h3>
                        <p className="text-gray-600 leading-relaxed whitespace-pre-wrap break-words">{formData.workExperience}</p>
                      </div>
                    )}

                    {/* Responsibilities */}
                    {formData.responsibilities && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-3 text-left">Responsibilities</h3>
                        <p className="text-gray-600 leading-relaxed whitespace-pre-wrap break-words">{formData.responsibilities}</p>
                      </div>
                    )}

                    {/* Benefits */}
                    {formData.benefits && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-3 text-left">Benefits</h3>
                        <p className="text-gray-600 leading-relaxed whitespace-pre-wrap break-words">{formData.benefits}</p>
                      </div>
                    )}

                    {/* About Company */}
                    {formData.aboutCompany && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-3 text-left">About Company</h3>
                        <p className="text-gray-600 leading-relaxed whitespace-pre-wrap break-words">{formData.aboutCompany}</p>
                      </div>
                    )}

                    {/* COMPANY INFO REMOVED – no preview block */}
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Edit Job Post
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="px-8 py-3 bg-blue-800 text-white rounded-lg hover:bg-blue-900 disabled:bg-blue-400 transition-colors inline-flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isLoading ? "Posting..." : "Post Job"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default PostJobs