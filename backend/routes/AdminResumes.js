import express from "express";
import db from "../config/database.js";
import { authenticateAdmin } from "./AdminAuth.js";

const router = express.Router();

// GET /api/admin/resumes - Fetch all resumes with filtering & sorting
router.get("/", authenticateAdmin, async (req, res) => {
  try {
    const { 
      search = "", 
      sortBy = "created_at",
      sortOrder = "DESC",
      page = 1,
      limit = 10
    } = req.query;

    const offset = (page - 1) * limit;

    // Build WHERE clause for user_profiles (resumes)
    let whereProfile = "WHERE 1=1";
    const paramsProfile = [];

    if (search) {
      whereProfile += " AND (up.first_name LIKE ? OR up.last_name LIKE ? OR up.resume_text LIKE ?)";
      paramsProfile.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Build WHERE clause for applications (CVs)
    let whereApp = "WHERE 1=1";
    const paramsApp = [];

    if (search) {
      whereApp += " AND (app.applicant_name LIKE ? OR app.cv_text LIKE ?)";
      paramsApp.push(`%${search}%`, `%${search}%`);
    }

    // Merge queries - get resumes from user_profiles
    const queryResumes = `
      SELECT 
        up.id,
        CONCAT(COALESCE(up.first_name, ''), ' ', COALESCE(up.last_name, '')) AS name,
        up.email,
        up.phone,
        up.city,
        up.state,
        up.country,
        up.job_type,
        up.expected_salary AS salary,
        up.resume_url AS fileUrl,
        up.resume_text AS resume_text,
        NULL AS cv_text,
        'resume' AS documentType,
        NULL AS status,
        up.created_at,
        up.updated_at
      FROM user_profiles up
      ${whereProfile}
    `;

    // Get CVs from applications
    const queryApplications = `
      SELECT 
        app.id,
        app.applicant_name AS name,
        app.applicant_email AS email,
        app.applicant_mobile AS phone,
        app.city,
        app.state,
        NULL AS country,
        NULL AS job_type,
        NULL AS salary,
        app.cv_url AS fileUrl,
        NULL AS resume_text,
        app.cv_text AS cv_text,
        'cv' AS documentType,
        app.status,
        app.created_at,
        app.updated_at
      FROM applications app
      ${whereApp}
    `;

    // Combine both queries with sorting
    const allParams = [...paramsProfile, ...paramsApp];
    const combinedQuery = `
      (${queryResumes})
      UNION ALL
      (${queryApplications})
      ORDER BY ${sortBy === "name" ? "name" : "created_at"} ${sortOrder.toUpperCase()}
      LIMIT ? OFFSET ?
    `;

    const [rows] = await db.query(combinedQuery, [...allParams, parseInt(limit), offset]);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total FROM (
        (${queryResumes})
        UNION ALL
        (${queryApplications})
      ) AS combined
    `;
    const [countResult] = await db.query(countQuery, allParams);
    const total = countResult[0].total;

    res.json({
      resumes: rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching resumes:", error);
    res.status(500).json({ error: "Failed to fetch resumes" });
  }
});

// GET /api/admin/resumes/:id/download - Download a specific resume/CV
router.get("/:id/download", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query; // type: 'resume' or 'cv'

    let fileUrl;

    if (type === "resume") {
      const [result] = await db.query(
        "SELECT resume_url FROM user_profiles WHERE id = ?",
        [id]
      );
      fileUrl = result[0]?.resume_url;
    } else if (type === "cv") {
      const [result] = await db.query(
        "SELECT cv_url FROM applications WHERE id = ?",
        [id]
      );
      fileUrl = result[0]?.cv_url;
    }

    if (!fileUrl) {
      return res.status(404).json({ error: "File not found" });
    }

    // Return the file URL - frontend will handle the download
    res.json({ fileUrl });
  } catch (error) {
    console.error("Error fetching download:", error);
    res.status(500).json({ error: "Failed to fetch file" });
  }
});

export default router;
