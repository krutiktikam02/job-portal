import express from "express";
import db from "../config/database.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// ──────────────────────────────────────────────────────────────
// Middleware – verify JWT
// ──────────────────────────────────────────────────────────────
const authenticateToken = (req, res, next) => {
  console.log("Authenticating token...");
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  console.log("Token received:", token ? "Present" : "Missing");

  if (!token) {
    console.log("No token provided");
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    console.log("Decoded token:", decoded);
    if (decoded.userType !== "job_poster") {
      console.log("User is not a job_poster");
      return res.status(403).json({ error: "Only job posters can perform this action" });
    }
    req.user = decoded;
    console.log("Token authenticated, user:", decoded.email);
    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

// ──────────────────────────────────────────────────────────────
// POST – create a new job posting
// ──────────────────────────────────────────────────────────────
router.post("/", authenticateToken, async (req, res) => {
  console.log("Received POST /api/jobs request");
  const {
    postingAs,
    consultancyHiringFor,
    companyName,
    jobTitle,
    jobLocation,
    jobType,
    skills,
    education,
    languages,
    payMin,
    payMax,
    jobDescription,
    workExperience,
    responsibilities,
    benefits,
    aboutCompany,
    // companyInfo REMOVED
  } = req.body;
  console.log("Request body:", req.body);

  // ───── Validation (companyName optional, companyInfo gone) ─────
  console.log("Validating request body...");
  const requiredFields = [
    { field: postingAs, name: "postingAs" },
    { field: jobTitle, name: "jobTitle" },
    { field: jobLocation, name: "jobLocation" },
    { field: jobType, name: "jobType" },
    { field: skills, name: "skills" },
    { field: education, name: "education" },
    { field: payMin, name: "payMin" },
    { field: payMax, name: "payMax" },
    { field: jobDescription, name: "jobDescription" },
    { field: workExperience, name: "workExperience" },
    { field: responsibilities, name: "responsibilities" },
  ];

  const errors = [];
  requiredFields.forEach(({ field, name }) => {
    if (!field || (typeof field === "string" && field.trim() === "") || (Array.isArray(field) && field.length === 0)) {
      errors.push(`${name} is required`);
    }
  });

  if (postingAs === "consultancy" && (!consultancyHiringFor || consultancyHiringFor.trim() === "")) {
    errors.push("consultancyHiringFor is required when posting as consultancy");
  }

  if (jobType && !Array.isArray(jobType)) {
    errors.push("jobType must be an array of job types (e.g., ['Full-time', 'Freelance'])");
  }

  if (payMin && isNaN(Number(payMin))) errors.push("payMin must be a valid number");
  if (payMax && isNaN(Number(payMax))) errors.push("payMax must be a valid number");

  if (errors.length > 0) {
    console.log("Validation errors:", errors);
    return res.status(400).json({ errors });
  }
  console.log("Validation passed");

  // ───── Insert into DB (company_info REMOVED) ─────
  try {
    console.log("Executing INSERT query...");
    const [result] = await db.query(
      `INSERT INTO jobs (
        user_id, posting_as, consultancy_hiring_for, company_name, job_title, job_location,
        job_type, skills, education, languages, pay_min, pay_max, job_description,
        work_experience, responsibilities, benefits, about_company, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        req.user.id,
        postingAs,
        consultancyHiringFor || null,
        companyName || null,
        jobTitle,
        jobLocation,
        JSON.stringify(jobType || []),
        skills,
        education,
        languages || null,
        payMin,
        payMax,
        jobDescription,
        workExperience,
        responsibilities,
        benefits || null,
        aboutCompany || null,
      ]
    );
    console.log("Job inserted, ID:", result.insertId);
    res.status(201).json({
      message: "Job posted successfully",
      jobId: result.insertId,
    });
  } catch (error) {
    console.error("Error creating job:", error.message);
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

// ──────────────────────────────────────────────────────────────
// PUT – update a job posting
// ──────────────────────────────────────────────────────────────
router.put("/:id", authenticateToken, async (req, res) => {
  console.log("Received PUT /api/jobs/:id request, ID:", req.params.id);
  const { id } = req.params;
  const {
    postingAs,
    consultancyHiringFor,
    companyName,
    jobTitle,
    jobLocation,
    jobType,
    skills,
    education,
    languages,
    payMin,
    payMax,
    jobDescription,
    workExperience,
    responsibilities,
    benefits,
    aboutCompany,
    // companyInfo REMOVED
  } = req.body;
  console.log("Request body:", req.body);

  // ───── Validation (same as POST) ─────
  const requiredFields = [
    { field: jobTitle, name: "jobTitle" },
    { field: jobLocation, name: "jobLocation" },
    { field: jobType, name: "jobType" },
    { field: skills, name: "skills" },
    { field: education, name: "education" },
    { field: payMin, name: "payMin" },
    { field: payMax, name: "payMax" },
    { field: jobDescription, name: "jobDescription" },
    { field: workExperience, name: "workExperience" },
    { field: responsibilities, name: "responsibilities" },
  ];

  const errors = [];
  requiredFields.forEach(({ field, name }) => {
    if (!field || (typeof field === "string" && field.trim() === "") || (Array.isArray(field) && field.length === 0)) {
      errors.push(`${name} is required`);
    }
  });

  if (postingAs === "consultancy" && (!consultancyHiringFor || consultancyHiringFor.trim() === "")) {
    errors.push("consultancyHiringFor is required when posting as consultancy");
  }

  if (jobType && !Array.isArray(jobType)) errors.push("jobType must be an array");
  if (payMin && isNaN(Number(payMin))) errors.push("payMin must be a valid number");
  if (payMax && isNaN(Number(payMax))) errors.push("payMax must be a valid number");

  if (errors.length > 0) {
    console.log("Validation errors:", errors);
    return res.status(400).json({ errors });
  }

  // ───── Update DB (company_info REMOVED) ─────
  try {
    const [existing] = await db.query("SELECT id FROM jobs WHERE id = ? AND user_id = ?", [id, req.user.id]);
    if (existing.length === 0) {
      console.log("Job not found or not owned by user, ID:", id);
      return res.status(404).json({ error: "Job not found" });
    }

    const [result] = await db.query(
      `UPDATE jobs SET 
        posting_as = ?, consultancy_hiring_for = ?, company_name = ?, job_title = ?, job_location = ?,
        job_type = ?, skills = ?, education = ?, languages = ?, pay_min = ?, pay_max = ?, job_description = ?,
        work_experience = ?, responsibilities = ?, benefits = ?, about_company = ?
        WHERE id = ? AND user_id = ?`,
      [
        postingAs,
        consultancyHiringFor || null,
        companyName || null,
        jobTitle,
        jobLocation,
        JSON.stringify(jobType || []),
        skills,
        education,
        languages || null,
        payMin,
        payMax,
        jobDescription,
        workExperience,
        responsibilities,
        benefits || null,
        aboutCompany || null,
        id,
        req.user.id,
      ]
    );

    if (result.affectedRows === 0) {
      console.log("No rows updated for job ID:", id);
      return res.status(404).json({ error: "Job not found" });
    }

    console.log("Job updated, ID:", id);
    res.status(200).json({ message: "Job updated successfully", jobId: id });
  } catch (error) {
    console.error("Error updating job:", error.message);
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

// ──────────────────────────────────────────────────────────────
// DELETE – delete a job posting
// ──────────────────────────────────────────────────────────────
router.delete("/:id", authenticateToken, async (req, res) => {
  console.log("Received DELETE /api/jobs/:id request, ID:", req.params.id);
  const { id } = req.params;

  try {
    const [existing] = await db.query("SELECT id FROM jobs WHERE id = ? AND user_id = ?", [id, req.user.id]);
    if (existing.length === 0) {
      console.log("Job not found or not owned by user, ID:", id);
      return res.status(404).json({ error: "Job not found" });
    }

    const [result] = await db.query("DELETE FROM jobs WHERE id = ? AND user_id = ?", [id, req.user.id]);

    if (result.affectedRows === 0) {
      console.log("No rows deleted for job ID:", id);
      return res.status(404).json({ error: "Job not found" });
    }

    console.log("Job deleted, ID:", id);
    res.status(200).json({ message: "Job deleted successfully", jobId: id });
  } catch (error) {
    console.error("Error deleting job:", error.message);
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

// ──────────────────────────────────────────────────────────────
// GET – all jobs for the authenticated job poster (requires auth)
// ──────────────────────────────────────────────────────────────
router.get("/", authenticateToken, async (req, res) => {
  console.log("Received GET /api/jobs request for current user");
  try {
    // Only return jobs created by the authenticated user (job poster)
    const [jobs] = await db.query("SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC", [req.user.id]);
    console.log("Fetched jobs for user:", req.user.id, "count:", jobs.length);

    const parsedJobs = jobs.map((job) => {
      let jobType = [];
      if (job.job_type) {
        try {
          jobType = JSON.parse(job.job_type);
        } catch (e) {
          console.warn("Invalid JSON in job_type for job ID " + job.id);
          jobType = job.job_type;
        }
      }
      return { ...job, job_type: jobType };
    });
    res.status(200).json(parsedJobs);
  } catch (error) {
    console.error("Error fetching jobs:", error.message);
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

// ──────────────────────────────────────────────────────────────
// GET – browse all jobs (public, for job seekers to search/browse)
// ──────────────────────────────────────────────────────────────
router.get("/browse/all", async (req, res) => {
  console.log("Received GET /api/jobs/browse/all request (public browse)");
  try {
    const [jobs] = await db.query("SELECT * FROM jobs ORDER BY created_at DESC");
    console.log("Fetched all jobs for browse:", jobs.length);

    const parsedJobs = jobs.map((job) => {
      let jobType = [];
      if (job.job_type) {
        try {
          jobType = JSON.parse(job.job_type);
        } catch (e) {
          console.warn("Invalid JSON in job_type for job ID " + job.id);
          jobType = job.job_type;
        }
      }
      return { ...job, job_type: jobType };
    });
    res.status(200).json(parsedJobs);
  } catch (error) {
    console.error("Error fetching jobs:", error.message);
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

// ──────────────────────────────────────────────────────────────
// GET – single job by ID
// ──────────────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  console.log("Received GET /api/jobs/:id request, ID:", req.params.id);
  const { id } = req.params;

  try {
    const [jobs] = await db.query("SELECT * FROM jobs WHERE id = ?", [id]);
    if (jobs.length === 0) {
      console.log("Job not found, ID:", id);
      return res.status(404).json({ error: "Job not found" });
    }
    const job = jobs[0];
    let jobType = [];
    if (job.job_type) {
      try {
        jobType = JSON.parse(job.job_type);
      } catch (e) {
        console.warn("Invalid JSON in job_type for job ID " + job.id);
        jobType = job.job_type;
      }
    }
    res.status(200).json({ ...job, job_type: jobType });
  } catch (error) {
    console.error("Error fetching job:", error.message, error.stack);
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

export default router;