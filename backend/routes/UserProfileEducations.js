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

// GET /api/usereducations - Fetch all education records
router.get("/", authenticateToken, async (req, res) => {
  console.log("📥 Received GET /api/usereducations request for user ID:", req.user.id, new Date().toISOString());
  try {
    const [profile] = await db.query("SELECT id FROM user_profiles WHERE user_id = ?", [req.user.id]);
    if (profile.length === 0) {
      console.log("❌ User profile not found for user ID:", req.user.id);
      return res.status(404).json({ error: "User profile not found" });
    }
    const [educations] = await db.query("SELECT id, degree, field_of_study, institution, course_type, start_year, end_year, cgpa, course_required_pass, created_at FROM user_education WHERE user_profile_id = ?", [profile[0].id]);
    console.log("✅ Fetched educations for user ID:", req.user.id, "Data:", educations);
    res.status(200).json(educations);
  } catch (error) {
    console.error("❌ Error fetching educations:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

// POST /api/usereducations - Add an education record
router.post("/", authenticateToken, async (req, res) => {
  console.log("📥 Received POST /api/usereducations request for user ID:", req.user.id, new Date().toISOString());
  const { degree, fieldOfStudy, institution, courseType, startYear, endYear, cgpa, courseRequiredPass } = req.body;
  console.log("Request body:", req.body);
  const errors = [];
  if (!degree || typeof degree !== "string" || degree.trim() === "") errors.push("degree is required");
  if (!institution || typeof institution !== "string" || institution.trim() === "") errors.push("institution is required");
  if (!courseType || !['Full Time', 'Part Time', 'Distance Learning', 'Online'].includes(courseType)) errors.push("courseType must be one of: Full Time, Part Time, Distance Learning, Online");
  if (fieldOfStudy && (typeof fieldOfStudy !== "string" || fieldOfStudy.trim() === "")) errors.push("fieldOfStudy must be a non-empty string");
  if (startYear && (isNaN(startYear) || startYear < 1900 || startYear > new Date().getFullYear())) errors.push("startYear must be a valid year between 1900 and current year");
  if (endYear && (isNaN(endYear) || endYear < 1900 || endYear > new Date().getFullYear())) errors.push("endYear must be a valid year between 1900 and current year");
  if (endYear && startYear && endYear < startYear) errors.push("endYear cannot be earlier than startYear");
  if (cgpa && (typeof cgpa !== "string" || cgpa.trim() === "" || !/^\d+(\.\d+)?$/.test(cgpa))) errors.push("cgpa must be a valid number string (e.g., '8.5')");
  if (courseRequiredPass !== undefined && typeof courseRequiredPass !== "boolean") errors.push("courseRequiredPass must be a boolean");
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
      "INSERT INTO user_education (user_profile_id, degree, field_of_study, institution, course_type, start_year, end_year, cgpa, course_required_pass) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [profile[0].id, degree.trim(), fieldOfStudy ? fieldOfStudy.trim() : null, institution.trim(), courseType, startYear || null, endYear || null, cgpa ? cgpa.trim() : null, courseRequiredPass || false]
    );
    console.log("✅ Added education for user ID:", req.user.id, "Degree:", degree, "Institution:", institution);
    res.status(201).json({ message: "Education added successfully" });
  } catch (error) {
    console.error("❌ Error adding education:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

// PUT /api/usereducations/:id - Update an education record
router.put("/:id", authenticateToken, async (req, res) => {
  console.log("📥 Received PUT /api/usereducations request for user ID:", req.user.id, new Date().toISOString());
  const { id } = req.params;
  const { degree, fieldOfStudy, institution, courseType, startYear, endYear, cgpa, courseRequiredPass } = req.body;
  console.log("Request body:", req.body);

  const errors = [];
  if (!degree || typeof degree !== "string" || degree.trim() === "") errors.push("degree is required");
  if (!institution || typeof institution !== "string" || institution.trim() === "") errors.push("institution is required");
  if (!courseType || !['Full Time', 'Part Time', 'Distance Learning', 'Online'].includes(courseType)) errors.push("courseType must be one of: Full Time, Part Time, Distance Learning, Online");
  if (fieldOfStudy && (typeof fieldOfStudy !== "string" || fieldOfStudy.trim() === "")) errors.push("fieldOfStudy must be a non-empty string");
  if (startYear && (isNaN(startYear) || startYear < 1900 || startYear > new Date().getFullYear())) errors.push("startYear must be a valid year between 1900 and current year");
  if (endYear && (isNaN(endYear) || endYear < 1900 || endYear > new Date().getFullYear())) errors.push("endYear must be a valid year between 1900 and current year");
  if (endYear && startYear && endYear < startYear) errors.push("endYear cannot be earlier than startYear");
  if (cgpa && (typeof cgpa !== "string" || cgpa.trim() === "" || !/^\d+(\.\d+)?$/.test(cgpa))) errors.push("cgpa must be a valid number string (e.g., '8.5')");
  if (courseRequiredPass !== undefined && typeof courseRequiredPass !== "boolean") errors.push("courseRequiredPass must be a boolean");
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
      "UPDATE user_education SET degree = ?, field_of_study = ?, institution = ?, course_type = ?, start_year = ?, end_year = ?, cgpa = ?, course_required_pass = ? WHERE id = ? AND user_profile_id = ?",
      [
        degree.trim(),
        fieldOfStudy ? fieldOfStudy.trim() : null,
        institution.trim(),
        courseType,
        startYear || null,
        endYear || null,
        cgpa ? cgpa.trim() : null,
        courseRequiredPass || false,
        id,
        profile[0].id,
      ]
    );

    if (result.affectedRows === 0) {
      console.log("❌ Education not found for user ID:", req.user.id, "ID:", id);
      return res.status(404).json({ error: "Education not found" });
    }

    console.log("✅ Updated education for user ID:", req.user.id, "ID:", id);
    res.status(200).json({ message: "Education updated successfully" });
  } catch (error) {
    console.error("❌ Error updating education:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

// DELETE /api/usereducations/:id - Delete an education record
router.delete("/:id", authenticateToken, async (req, res) => {
  console.log("📥 Received DELETE /api/usereducations request for user ID:", req.user.id, new Date().toISOString());
  const { id } = req.params;
  console.log("Education ID to delete:", id);
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
      "DELETE FROM user_education WHERE id = ? AND user_profile_id = ?",
      [id, profile[0].id]
    );
    if (result.affectedRows === 0) {
      console.log("❌ Education not found for user ID:", req.user.id, "ID:", id);
      return res.status(404).json({ error: "Education not found" });
    }
    console.log("✅ Deleted education for user ID:", req.user.id, "ID:", id);
    res.status(200).json({ message: "Education deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting education:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

export default router;