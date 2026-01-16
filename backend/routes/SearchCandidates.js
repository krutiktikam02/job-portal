// routes/SearchCandidates.js
import express from "express";
import db from "../config/database.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access token required" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token", details: error.message });
  }
};

router.get("/", authenticateToken, async (req, res) => {
  try {
    const { keywords, location } = req.query;

    let query = `
      SELECT up.id, up.first_name, up.last_name, up.email, up.preferred_location, up.profile_summary,
             CASE WHEN up.resume_url IS NOT NULL THEN up.resume_url ELSE MAX(a.cv_url) END as resume_url,
             CASE WHEN up.resume_text IS NOT NULL THEN up.resume_text ELSE MAX(a.cv_text) END as resume_text
      FROM user_profiles up
      LEFT JOIN applications a ON up.user_id = a.user_id
      WHERE (up.resume_url IS NOT NULL OR a.cv_url IS NOT NULL)
    `;
    let params = [];

    if (keywords) {
      query += " AND (up.resume_text LIKE ? OR a.cv_text LIKE ?)";
      params.push(`%${keywords}%`, `%${keywords}%`);
    }

    if (location) {
      query += " AND (up.preferred_location LIKE ? OR a.city LIKE ?)";
      params.push(`%${location}%`, `%${location}%`);
    }

    query += `
      GROUP BY up.id, up.first_name, up.last_name, up.email, up.preferred_location, up.profile_summary, up.resume_url, up.resume_text
      ORDER BY up.updated_at DESC
      LIMIT 50
    `;

    console.log("Search query:", query);
    console.log("Search params:", params);

    const [rows] = await db.query(query, params);

    res.status(200).json(rows);
  } catch (error) {
    console.error("Search candidates error:", error);
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
});

export default router;