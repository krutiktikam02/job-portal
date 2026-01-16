import express from "express";
import db from "../config/database.js";
import jwt from "jsonwebtoken";

const router = express.Router();

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
    req.user = decoded;
    console.log("Token authenticated, user:", decoded.email);
    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

// GET /api/saved-candidates - Get all saved candidates for the current user (job_poster only)
router.get("/", authenticateToken, async (req, res) => {
  try {
    console.log("[saved-candidates] Received GET request for user:", req.user.id);

    if (req.user.userType !== "job_poster") {
      return res.status(403).json({ error: "Only job posters can view saved candidates" });
    }

    const query = `
      SELECT 
        id,
        candidate_id,
        first_name,
        last_name,
        email,
        location,
        resume_url,
        profile_summary,
        created_at,
        updated_at
      FROM saved_candidates
      WHERE user_id = ?
      ORDER BY created_at DESC
    `;

    const [results] = await db.query(query, [req.user.id]);
    console.log("[saved-candidates] Fetched", results.length, "saved candidates");
    res.json(results);
  } catch (error) {
    console.error("[saved-candidates] Error fetching saved candidates:", error.message);
    res.status(500).json({ error: "Failed to fetch saved candidates" });
  }
});

// POST /api/saved-candidates - Save a candidate from search results
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { candidate_id, first_name, last_name, email, location, resume_url, profile_summary } = req.body;
    console.log("[saved-candidates] Received POST to save candidate:", candidate_id, "for user:", req.user.id);

    if (req.user.userType !== "job_poster") {
      return res.status(403).json({ error: "Only job posters can save candidates" });
    }

    if (!candidate_id) {
      return res.status(400).json({ error: "candidate_id is required" });
    }

    const saveQuery = `
      INSERT INTO saved_candidates (user_id, candidate_id, first_name, last_name, email, location, resume_url, profile_summary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP
    `;

    const [result] = await db.query(saveQuery, [
      req.user.id,
      candidate_id,
      first_name,
      last_name,
      email,
      location,
      resume_url,
      profile_summary
    ]);
    
    console.log("[saved-candidates] Candidate saved successfully");
    res.json({ success: true, message: "Candidate saved successfully", id: result.insertId });
  } catch (error) {
    console.error("[saved-candidates] Error saving candidate:", error.message);
    res.status(500).json({ error: "Failed to save candidate" });
  }
});

// DELETE /api/saved-candidates/:candidateId - Unsave a candidate
router.delete("/:candidateId", authenticateToken, async (req, res) => {
  try {
    const { candidateId } = req.params;
    console.log("[saved-candidates] Received DELETE to unsave candidate:", candidateId, "for user:", req.user.id);

    if (req.user.userType !== "job_poster") {
      return res.status(403).json({ error: "Only job posters can unsave candidates" });
    }

    const query = `
      DELETE FROM saved_candidates
      WHERE user_id = ? AND candidate_id = ?
    `;

    const [result] = await db.query(query, [req.user.id, candidateId]);
    
    if (result.affectedRows === 0) {
      console.log("[saved-candidates] Saved candidate not found");
      return res.status(404).json({ error: "Saved candidate not found" });
    }

    console.log("[saved-candidates] Candidate unsaved successfully");
    res.json({ success: true, message: "Candidate unsaved successfully" });
  } catch (error) {
    console.error("[saved-candidates] Error unsaving candidate:", error.message);
    res.status(500).json({ error: "Failed to unsave candidate" });
  }
});

// GET /api/saved-candidates/check/:candidateId - Check if candidate is saved
router.get("/check/:candidateId", authenticateToken, async (req, res) => {
  try {
    const { candidateId } = req.params;
    console.log("[saved-candidates] Checking if candidate", candidateId, "is saved for user:", req.user.id);

    if (req.user.userType !== "job_poster") {
      return res.status(403).json({ error: "Only job posters can check saved candidates" });
    }

    const query = `
      SELECT id FROM saved_candidates
      WHERE user_id = ? AND candidate_id = ?
      LIMIT 1
    `;

    const [results] = await db.query(query, [req.user.id, candidateId]);
    console.log("[saved-candidates] Check result:", results.length > 0 ? "saved" : "not saved");
    res.json({ isSaved: results.length > 0 });
  } catch (error) {
    console.error("[saved-candidates] Error checking saved candidate:", error.message);
    res.status(500).json({ error: "Failed to check saved candidate" });
  }
});

export default router;
