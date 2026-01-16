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

// GET /api/useremployments - Fetch all employments with skills
router.get("/", authenticateToken, async (req, res) => {
  console.log("📥 Received GET /api/useremployments request for user ID:", req.user.id, new Date().toISOString());
  try {
    const [profile] = await db.query("SELECT id FROM user_profiles WHERE user_id = ?", [req.user.id]);
    if (profile.length === 0) {
      console.log("❌ User profile not found for user ID:", req.user.id);
      return res.status(404).json({ error: "User profile not found" });
    }
    const [employments] = await db.query("SELECT id, company_name, position, start_date, end_date, is_ongoing, location, work_description, created_at FROM user_employment WHERE user_profile_id = ?", [profile[0].id]);
    const employmentIds = employments.map(e => e.id);
    let skills = [];
    if (employmentIds.length > 0) {
      [skills] = await db.query("SELECT user_employment_id, skill_name, created_at FROM user_employment_skills WHERE user_employment_id IN (?)", [employmentIds]);
    }
    const employmentsWithSkills = employments.map(employment => ({
      ...employment,
      skills: skills.filter(s => s.user_employment_id === employment.id).map(s => ({ name: s.skill_name, created_at: s.created_at }))
    }));
    console.log("✅ Fetched employments for user ID:", req.user.id, "Data:", employmentsWithSkills);
    res.status(200).json(employmentsWithSkills);
  } catch (error) {
    console.error("❌ Error fetching employments:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

// POST /api/useremployments - Add an employment with skills
router.post("/", authenticateToken, async (req, res) => {
  console.log("📥 Received POST /api/useremployments request for user ID:", req.user.id, new Date().toISOString());
  const { companyName, position, startDate, endDate, isOngoing, location, workDescription, skills } = req.body;
  console.log("Request body:", req.body);
  const errors = [];
  if (!companyName || typeof companyName !== "string" || companyName.trim() === "") errors.push("companyName is required");
  if (!position || typeof position !== "string" || position.trim() === "") errors.push("position is required");
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) errors.push("startDate must be a valid date (YYYY-MM-DD)");
  if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) errors.push("endDate must be a valid date (YYYY-MM-DD)");
  if (endDate && startDate && new Date(endDate) < new Date(startDate)) errors.push("endDate cannot be earlier than startDate");
  if (isOngoing !== undefined && typeof isOngoing !== "boolean") errors.push("isOngoing must be a boolean");
  if (location && (typeof location !== "string" || location.trim() === "")) errors.push("location must be a non-empty string");
  if (workDescription && (typeof workDescription !== "string" || workDescription.trim() === "")) errors.push("workDescription must be a non-empty string");
  if (skills && (!Array.isArray(skills) || skills.some(s => typeof s !== "string" || s.trim() === ""))) errors.push("skills must be an array of non-empty strings");
  if (isOngoing && endDate) errors.push("endDate must be null if isOngoing is true");
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
      "INSERT INTO user_employment (user_profile_id, company_name, position, start_date, end_date, is_ongoing, location, work_description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [profile[0].id, companyName.trim(), position.trim(), startDate, endDate || null, isOngoing || false, location ? location.trim() : null, workDescription ? workDescription.trim() : null]
    );
    const employmentId = result.insertId;
    if (skills && skills.length > 0) {
      const uniqueSkills = [...new Set(skills.map(s => s.trim()))];
      const skillValues = uniqueSkills.map(skill => [employmentId, skill]);
      await db.query("INSERT INTO user_employment_skills (user_employment_id, skill_name) VALUES ?", [skillValues]);
    }
    console.log("✅ Added employment for user ID:", req.user.id, "Company:", companyName, "Position:", position, "Skills:", skills || []);
    res.status(201).json({ message: "Employment added successfully" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      console.log("❌ Duplicate skill entry for employment");
      return res.status(400).json({ error: "Duplicate skill for this employment" });
    }
    console.error("❌ Error adding employment:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

// PUT /api/useremployments/:id - Update an employment with skills
router.put("/:id", authenticateToken, async (req, res) => {
  console.log("📥 Received PUT /api/useremployments request for user ID:", req.user.id, new Date().toISOString());
  const { id } = req.params;
  const { companyName, position, startDate, endDate, isOngoing, location, workDescription, skills } = req.body;
  console.log("Employment ID:", id, "Request body:", req.body);
  const errors = [];
  if (!id || isNaN(id)) errors.push("id is required and must be a number");
  if (!companyName || typeof companyName !== "string" || companyName.trim() === "") errors.push("companyName is required");
  if (!position || typeof position !== "string" || position.trim() === "") errors.push("position is required");
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) errors.push("startDate must be a valid date (YYYY-MM-DD)");
  if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) errors.push("endDate must be a valid date (YYYY-MM-DD)");
  if (endDate && startDate && new Date(endDate) < new Date(startDate)) errors.push("endDate cannot be earlier than startDate");
  if (isOngoing !== undefined && typeof isOngoing !== "boolean") errors.push("isOngoing must be a boolean");
  if (location && (typeof location !== "string" || location.trim() === "")) errors.push("location must be a non-empty string");
  if (workDescription && (typeof workDescription !== "string" || workDescription.trim() === "")) errors.push("workDescription must be a non-empty string");
  if (skills && (!Array.isArray(skills) || skills.some(s => typeof s !== "string" || s.trim() === ""))) errors.push("skills must be an array of non-empty strings");
  if (isOngoing && endDate) errors.push("endDate must be null if isOngoing is true");
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
    const [employment] = await db.query("SELECT id FROM user_employment WHERE id = ? AND user_profile_id = ?", [id, profile[0].id]);
    if (employment.length === 0) {
      console.log("❌ Employment not found for user ID:", req.user.id, "ID:", id);
      return res.status(404).json({ error: "Employment not found" });
    }
    await db.query(
      "UPDATE user_employment SET company_name = ?, position = ?, start_date = ?, end_date = ?, is_ongoing = ?, location = ?, work_description = ? WHERE id = ? AND user_profile_id = ?",
      [companyName.trim(), position.trim(), startDate, isOngoing ? null : endDate || null, isOngoing || false, location ? location.trim() : null, workDescription ? workDescription.trim() : null, id, profile[0].id]
    );
    await db.query("DELETE FROM user_employment_skills WHERE user_employment_id = ?", [id]);
    if (skills && skills.length > 0) {
      const uniqueSkills = [...new Set(skills.map(s => s.trim()))];
      const skillValues = uniqueSkills.map(skill => [id, skill]);
      await db.query("INSERT INTO user_employment_skills (user_employment_id, skill_name) VALUES ?", [skillValues]);
    }
    console.log("✅ Updated employment for user ID:", req.user.id, "Employment ID:", id, "Company:", companyName, "Position:", position, "Skills:", skills || []);
    res.status(200).json({ message: "Employment updated successfully" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      console.log("❌ Duplicate skill entry for employment ID:", id);
      return res.status(400).json({ error: "Duplicate skill for this employment" });
    }
    console.error("❌ Error updating employment:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

// DELETE /api/useremployments/:id - Delete an employment
router.delete("/:id", authenticateToken, async (req, res) => {
  console.log("📥 Received DELETE /api/useremployments request for user ID:", req.user.id, new Date().toISOString());
  const { id } = req.params;
  console.log("Employment ID to delete:", id);
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
      "DELETE FROM user_employment WHERE id = ? AND user_profile_id = ?",
      [id, profile[0].id]
    );
    if (result.affectedRows === 0) {
      console.log("❌ Employment not found for user ID:", req.user.id, "ID:", id);
      return res.status(404).json({ error: "Employment not found" });
    }
    console.log("✅ Deleted employment for user ID:", req.user.id, "ID:", id);
    res.status(200).json({ message: "Employment deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting employment:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

// POST /api/useremployments/:id/skills - Add skills to an employment
router.post("/:id/skills", authenticateToken, async (req, res) => {
  console.log("📥 Received POST /api/useremployments/:id/skills request for user ID:", req.user.id, new Date().toISOString());
  const { id } = req.params;
  const { skills } = req.body;
  console.log("Employment ID:", id, "Request body:", req.body);
  if (!id || isNaN(id)) {
    console.log("❌ Validation error: id is required and must be a number");
    return res.status(400).json({ errors: ["id is required and must be a number"] });
  }
  if (!skills || !Array.isArray(skills) || skills.some(s => typeof s !== "string" || s.trim() === "")) {
    console.log("❌ Validation error: skills must be an array of non-empty strings");
    return res.status(400).json({ errors: ["skills must be an array of non-empty strings"] });
  }
  try {
    const [profile] = await db.query("SELECT id FROM user_profiles WHERE user_id = ?", [req.user.id]);
    if (profile.length === 0) {
      console.log("❌ User profile not found for user ID:", req.user.id);
      return res.status(404).json({ error: "User profile not found" });
    }
    const [employment] = await db.query("SELECT id FROM user_employment WHERE id = ? AND user_profile_id = ?", [id, profile[0].id]);
    if (employment.length === 0) {
      console.log("❌ Employment not found for user ID:", req.user.id, "ID:", id);
      return res.status(404).json({ error: "Employment not found" });
    }
    const uniqueSkills = [...new Set(skills.map(s => s.trim()))];
    const skillValues = uniqueSkills.map(skill => [id, skill]);
    await db.query("INSERT INTO user_employment_skills (user_employment_id, skill_name) VALUES ?", [skillValues]);
    console.log("✅ Added skills for user ID:", req.user.id, "Employment ID:", id, "Skills:", uniqueSkills);
    res.status(201).json({ message: "Skills added successfully" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      console.log("❌ Duplicate skill entry for employment ID:", id);
      return res.status(400).json({ error: "Duplicate skill for this employment" });
    }
    console.error("❌ Error adding skills:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

// DELETE /api/useremployments/:id/skills/:skillName - Delete a skill from an employment
router.delete("/:id/skills/:skillName", authenticateToken, async (req, res) => {
  console.log("📥 Received DELETE /api/useremployments/:id/skills request for user ID:", req.user.id, new Date().toISOString());
  const { id, skillName } = req.params;
  console.log("Employment ID:", id, "Skill to delete:", skillName);
  if (!id || isNaN(id)) {
    console.log("❌ Validation error: id is required and must be a number");
    return res.status(400).json({ errors: ["id is required and must be a number"] });
  }
  if (!skillName || typeof skillName !== "string" || skillName.trim() === "") {
    console.log("❌ Validation error: skillName is required");
    return res.status(400).json({ errors: ["skillName is required"] });
  }
  try {
    const [profile] = await db.query("SELECT id FROM user_profiles WHERE user_id = ?", [req.user.id]);
    if (profile.length === 0) {
      console.log("❌ User profile not found for user ID:", req.user.id);
      return res.status(404).json({ error: "User profile not found" });
    }
    const [employment] = await db.query("SELECT id FROM user_employment WHERE id = ? AND user_profile_id = ?", [id, profile[0].id]);
    if (employment.length === 0) {
      console.log("❌ Employment not found for user ID:", req.user.id, "ID:", id);
      return res.status(404).json({ error: "Employment not found" });
    }
    const [result] = await db.query(
      "DELETE FROM user_employment_skills WHERE user_employment_id = ? AND skill_name = ?",
      [id, skillName.trim()]
    );
    if (result.affectedRows === 0) {
      console.log("❌ Skill not found for employment ID:", id, "Skill:", skillName);
      return res.status(404).json({ error: "Skill not found" });
    }
    console.log("✅ Deleted skill for user ID:", req.user.id, "Employment ID:", id, "Skill:", skillName);
    res.status(200).json({ message: "Skill deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting skill:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

export default router;