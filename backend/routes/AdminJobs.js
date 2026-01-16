import express from "express";
import db from "../config/database.js";
import { authenticateAdmin } from "./AdminAuth.js";

const router = express.Router();

// Get all jobs with pagination and filters
router.get("/", authenticateAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const q = req.query.q || ""; // search query
    const jobType = req.query.employment_type || ""; // job type filter

    // Use user_id as poster reference and full_name from users table
    let query = `
      SELECT j.*, u.full_name as poster_name, 
      COUNT(DISTINCT a.id) as application_count
      FROM jobs j
      LEFT JOIN users u ON j.user_id = u.id
      LEFT JOIN applications a ON j.id = a.job_id
      WHERE 1=1
    `;
    
    let countQuery = "SELECT COUNT(*) as total FROM jobs WHERE 1=1";
    const params = [];
    const countParams = [];

    if (q) {
      query += " AND (j.job_title LIKE ? OR j.job_description LIKE ?)";
      countQuery += " AND (job_title LIKE ? OR job_description LIKE ?)";
      const searchParam = `%${q}%`;
      params.push(searchParam, searchParam);
      countParams.push(searchParam, searchParam);
    }

    if (jobType) {
      query += " AND JSON_CONTAINS(j.job_type, ?)";
      countQuery += " AND JSON_CONTAINS(job_type, ?)";
      params.push(JSON.stringify(jobType));
      countParams.push(JSON.stringify(jobType));
    }

    query += " GROUP BY j.id ORDER BY j.created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const [jobs] = await db.query(query, params);
    const [totalCount] = await db.query(countQuery, countParams);

    const formattedJobs = jobs.map(job => ({
      ...job,
      employment_type: job.job_type ? (typeof job.job_type === 'string' ? job.job_type : JSON.stringify(job.job_type)) : '',
      location: job.job_location || '',
      title: job.job_title || ''
    }));

    res.json({
      jobs: formattedJobs,
      pagination: {
        total: totalCount[0].total,
        page,
        limit,
        pages: Math.ceil(totalCount[0].total / limit)
      }
    });
  } catch (error) {
    console.error("Get jobs error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get job details with applications count
router.get("/:id", authenticateAdmin, async (req, res) => {
  try {
    const [jobs] = await db.query(
      `SELECT j.*, u.full_name as poster_name,
       COUNT(DISTINCT a.id) as application_count
       FROM jobs j
       LEFT JOIN users u ON j.user_id = u.id
       LEFT JOIN applications a ON j.id = a.job_id
       WHERE j.id = ?
       GROUP BY j.id`,
      [req.params.id]
    );

    if (jobs.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Get applications for this job
    const [applications] = await db.query(
      `SELECT a.*, u.full_name as applicant_name
       FROM applications a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.job_id = ?
       ORDER BY a.created_at DESC`,
      [req.params.id]
    );

    const job = jobs[0];
    job.applications = applications;

    res.json(job);
  } catch (error) {
    console.error("Get job details error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", authenticateAdmin, async (req, res) => {
  try {
    const jobId = req.params.id;

    // Check if job exists
    const [jobs] = await db.query("SELECT id FROM jobs WHERE id = ?", [jobId]);
    if (jobs.length === 0) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Delete associated applications first
    await db.query("DELETE FROM applications WHERE job_id = ?", [jobId]);

    // Delete the job
    await db.query("DELETE FROM jobs WHERE id = ?", [jobId]);

    res.json({ message: "Job deleted successfully" });
  } catch (error) {
    console.error("Delete job error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Update job status
router.patch("/:id/status", authenticateAdmin, async (req, res) => {
  const { status } = req.body;
  
  if (!["active", "inactive", "closed"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  try {
    // Check whether `status` column exists in jobs table before attempting update
    const [cols] = await db.query("SHOW COLUMNS FROM jobs LIKE 'status'");
    if (!cols || cols.length === 0) {
      return res.status(400).json({ error: "Jobs table does not have a 'status' column" });
    }

    await db.query(
      "UPDATE jobs SET status = ? WHERE id = ?",
      [status, req.params.id]
    );

    res.json({ message: "Job status updated successfully" });
  } catch (error) {
    console.error("Update job status error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
