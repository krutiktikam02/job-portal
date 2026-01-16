import express from "express";
import db from "../config/database.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// Authenticate JWT token
const authenticateToken = (req, res, next) => {
  console.log("🔍 Authenticating token...", new Date().toISOString());
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  console.log("Token received:", token ? "Present" : "Missing");
  if (!token) {
    console.log("❌ No token provided");
    return res.status(401).json({ error: "Access token required" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    console.log("Decoded token:", decoded);
    req.user = decoded;
    console.log("✅ Token authenticated, user:", decoded.email, "user_id:", decoded.id);
    next();
  } catch (error) {
    console.error("❌ Token verification failed:", error.message);
    return res.status(403).json({ error: "Invalid or expired token", details: error.message });
  }
};

// GET /api/userinternships - Fetch all internships
router.get("/", authenticateToken, async (req, res) => {
  console.log("📥 Received GET /api/userinternships request for user ID:", req.user.id, new Date().toISOString());
  try {
    const [profile] = await db.query("SELECT id FROM user_profiles WHERE user_id = ?", [req.user.id]);
    if (profile.length === 0) {
      console.log("❌ User profile not found for user ID:", req.user.id);
      return res.status(404).json({ error: "User profile not found" });
    }
    const [internships] = await db.query("SELECT id, company, role, project_name, location, start_date, end_date, description, created_at FROM user_internships WHERE user_profile_id = ?", [profile[0].id]);
    console.log("✅ Fetched internships for user ID:", req.user.id, "Data:", internships);
    res.status(200).json(internships);
  } catch (error) {
    console.error("❌ Error fetching internships:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

// POST /api/userinternships - Add an internship
router.post("/", authenticateToken, async (req, res) => {
  console.log("📥 Received POST /api/userinternships request for user ID:", req.user.id, new Date().toISOString());
  const { company, role, projectName, location, startDate, endDate, description } = req.body;
  console.log("Request body:", req.body);
  const errors = [];
  if (!company || typeof company !== "string" || company.trim() === "") errors.push("company is required");
  if (!role || typeof role !== "string" || role.trim() === "") errors.push("role is required");
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) errors.push("startDate must be a valid date (YYYY-MM-DD)");
  if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) errors.push("endDate must be a valid date (YYYY-MM-DD)");
  if (endDate && startDate && new Date(endDate) < new Date(startDate)) errors.push("endDate cannot be earlier than startDate");
  if (projectName && (typeof projectName !== "string" || projectName.trim() === "")) errors.push("projectName must be a non-empty string");
  if (location && (typeof location !== "string" || location.trim() === "")) errors.push("location must be a non-empty string");
  if (description && (typeof description !== "string" || description.trim() === "")) errors.push("description must be a non-empty string");
  if (errors.length > 0) {
    console.log("❌ Validation errors:", errors, new Date().toISOString());
    return res.status(400).json({ errors });
  }
  try {
    const [profile] = await db.query("SELECT id FROM user_profiles WHERE user_id = ?", [req.user.id]);
    if (profile.length === 0) {
      console.log("❌ User profile not found for user ID:", req.user.id);
      return res.status(404).json({ error: "User profile not found" });
    }
    await db.query(
      "INSERT INTO user_internships (user_profile_id, company, role, project_name, location, start_date, end_date, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [profile[0].id, company.trim(), role.trim(), projectName ? projectName.trim() : null, location ? location.trim() : null, startDate, endDate || null, description ? description.trim() : null]
    );
    console.log("✅ Added internship for user ID:", req.user.id, "Company:", company, "Role:", role);
    res.status(201).json({ message: "Internship added successfully" });
  } catch (error) {
    console.error("❌ Error adding internship:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

// PUT /api/userinternships/:id - Update an internship
router.put("/:id", authenticateToken, async (req, res) => {
  console.log("📥 Received PUT /api/userinternships request for user ID:", req.user.id, "Internship ID:", req.params.id, new Date().toISOString());
  const { id } = req.params;
  const { company, role, projectName, location, startDate, endDate, description } = req.body;
  console.log("Request body:", req.body);
  const errors = [];
  if (!id || isNaN(id)) errors.push("id is required and must be a number");
  if (!company || typeof company !== "string" || company.trim() === "") errors.push("company is required");
  if (!role || typeof role !== "string" || role.trim() === "") errors.push("role is required");
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) errors.push("startDate must be a valid date (YYYY-MM-DD)");
  if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) errors.push("endDate must be a valid date (YYYY-MM-DD)");
  if (endDate && startDate && new Date(endDate) < new Date(startDate)) errors.push("endDate cannot be earlier than startDate");
  if (projectName && (typeof projectName !== "string" || projectName.trim() === "")) errors.push("projectName must be a non-empty string");
  if (location && (typeof location !== "string" || location.trim() === "")) errors.push("location must be a non-empty string");
  if (description && (typeof description !== "string" || description.trim() === "")) errors.push("description must be a non-empty string");
  if (errors.length > 0) {
    console.log("❌ Validation errors:", errors, new Date().toISOString());
    return res.status(400).json({ errors });
  }
  try {
    const [profile] = await db.query("SELECT id FROM user_profiles WHERE user_id = ?", [req.user.id]);
    if (profile.length === 0) {
      console.log("❌ User profile not found for user ID:", req.user.id);
      return res.status(404).json({ error: "User profile not found" });
    }
    const [result] = await db.query(
      "UPDATE user_internships SET company = ?, role = ?, project_name = ?, location = ?, start_date = ?, end_date = ?, description = ? WHERE id = ? AND user_profile_id = ?",
      [
        company.trim(),
        role.trim(),
        projectName ? projectName.trim() : null,
        location ? location.trim() : null,
        startDate,
        endDate || null,
        description ? description.trim() : null,
        id,
        profile[0].id,
      ]
    );
    if (result.affectedRows === 0) {
      console.log("❌ Internship not found for user ID:", req.user.id, "ID:", id);
      return res.status(404).json({ error: "Internship not found" });
    }
    console.log("✅ Updated internship for user ID:", req.user.id, "ID:", id);
    res.status(200).json({ message: "Internship updated successfully" });
  } catch (error) {
    console.error("❌ Error updating internship:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

// DELETE /api/userinternships/:id - Delete an internship
router.delete("/:id", authenticateToken, async (req, res) => {
  console.log("📥 Received DELETE /api/userinternships request for user ID:", req.user.id, new Date().toISOString());
  const { id } = req.params;
  console.log("Internship ID to delete:", id);
  if (!id || isNaN(id)) {
    console.log("❌ Validation error: id is required and must be a number");
    return res.status(400).json({ errors: ["id is required and must be a number"] });
  }
  try {
    const [profile] = await db.query("SELECT id FROM user_profiles WHERE user_id = ?", [req.user.id]);
    if (profile.length === 0) {
      console.log("❌ User profile not found for user ID:", req.user.id);
      return res.status(404).json({ error: "User profile not found" });
    }
    const [result] = await db.query(
      "DELETE FROM user_internships WHERE id = ? AND user_profile_id = ?",
      [id, profile[0].id]
    );
    if (result.affectedRows === 0) {
      console.log("❌ Internship not found for user ID:", req.user.id, "ID:", id);
      return res.status(404).json({ error: "Internship not found" });
    }
    console.log("✅ Deleted internship for user ID:", req.user.id, "ID:", id);
    res.status(200).json({ message: "Internship deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting internship:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

export default router;