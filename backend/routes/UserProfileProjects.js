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

// GET /api/userprojects - Fetch all projects with technologies
router.get("/", authenticateToken, async (req, res) => {
  console.log("📥 Received GET /api/userprojects request for user ID:", req.user.id, new Date().toISOString());
  try {
    const [profile] = await db.query("SELECT id FROM user_profiles WHERE user_id = ?", [req.user.id]);
    if (profile.length === 0) {
      console.log("❌ User profile not found for user ID:", req.user.id);
      return res.status(404).json({ error: "User profile not found" });
    }
    const [projects] = await db.query("SELECT id, title, duration, description, link, created_at FROM user_projects WHERE user_profile_id = ?", [profile[0].id]);
    const projectIds = projects.map(p => p.id);
    let technologies = [];
    if (projectIds.length > 0) {
      [technologies] = await db.query("SELECT user_project_id, technology_name, created_at FROM user_project_technologies WHERE user_project_id IN (?)", [projectIds]);
    }
    const projectsWithTech = projects.map(project => ({
      ...project,
      technologies: technologies.filter(t => t.user_project_id === project.id).map(t => ({ name: t.technology_name, created_at: t.created_at }))
    }));
    console.log("✅ Fetched projects for user ID:", req.user.id, "Data:", projectsWithTech);
    res.status(200).json(projectsWithTech);
  } catch (error) {
    console.error("❌ Error fetching projects:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

// POST /api/userprojects - Add a project with technologies
router.post("/", authenticateToken, async (req, res) => {
  console.log("📥 Received POST /api/userprojects request for user ID:", req.user.id, new Date().toISOString());
  const { title, duration, description, link, technologies } = req.body;
  console.log("Request body:", req.body);
  const errors = [];
  if (!title || typeof title !== "string" || title.trim() === "") errors.push("title is required");
  if (!description || typeof description !== "string" || description.trim() === "") errors.push("description is required");
  if (duration && (typeof duration !== "string" || duration.trim() === "")) errors.push("duration must be a non-empty string");
  if (link && !/^(https?:\/\/)?([\w-]+(\.[\w-]+)+\/?|localhost)(:\d+)?([/]?[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/.test(link)) errors.push("link must be a valid URL");
  if (technologies && (!Array.isArray(technologies) || technologies.some(t => typeof t !== "string" || t.trim() === ""))) errors.push("technologies must be an array of non-empty strings");
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
      "INSERT INTO user_projects (user_profile_id, title, duration, description, link) VALUES (?, ?, ?, ?, ?)",
      [profile[0].id, title.trim(), duration ? duration.trim() : null, description.trim(), link ? link.trim() : null]
    );
    const projectId = result.insertId;
    if (technologies && technologies.length > 0) {
      const uniqueTechnologies = [...new Set(technologies.map(t => t.trim()))];
      const techValues = uniqueTechnologies.map(tech => [projectId, tech]);
      await db.query("INSERT INTO user_project_technologies (user_project_id, technology_name) VALUES ?", [techValues]);
    }
    console.log("✅ Added project for user ID:", req.user.id, "Title:", title, "Technologies:", technologies || []);
    res.status(201).json({ message: "Project added successfully" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      console.log("❌ Duplicate technology entry for project");
      return res.status(400).json({ error: "Duplicate technology for this project" });
    }
    console.error("❌ Error adding project:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

// PUT /api/userprojects/:id - Update a project with technologies
router.put("/:id", authenticateToken, async (req, res) => {
  console.log("📥 Received PUT /api/userprojects request for user ID:", req.user.id, new Date().toISOString());
  const { id } = req.params;
  const { title, duration, description, link, technologies } = req.body;
  console.log("Project ID:", id, "Request body:", req.body);
  const errors = [];
  if (!id || isNaN(id)) errors.push("id is required and must be a number");
  if (!title || typeof title !== "string" || title.trim() === "") errors.push("title is required");
  if (!description || typeof description !== "string" || description.trim() === "") errors.push("description is required");
  if (duration && (typeof duration !== "string" || duration.trim() === "")) errors.push("duration must be a non-empty string");
  if (link && !/^(https?:\/\/)?([\w-]+(\.[\w-]+)+\/?|localhost)(:\d+)?([/]?[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/.test(link)) errors.push("link must be a valid URL");
  if (technologies && (!Array.isArray(technologies) || technologies.some(t => typeof t !== "string" || t.trim() === ""))) errors.push("technologies must be an array of non-empty strings");
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
    const [project] = await db.query("SELECT id FROM user_projects WHERE id = ? AND user_profile_id = ?", [id, profile[0].id]);
    if (project.length === 0) {
      console.log("❌ Project not found for user ID:", req.user.id, "ID:", id);
      return res.status(404).json({ error: "Project not found" });
    }
    await db.query(
      "UPDATE user_projects SET title = ?, duration = ?, description = ?, link = ? WHERE id = ? AND user_profile_id = ?",
      [title.trim(), duration ? duration.trim() : null, description.trim(), link ? link.trim() : null, id, profile[0].id]
    );
    // Delete existing technologies and insert new ones
    await db.query("DELETE FROM user_project_technologies WHERE user_project_id = ?", [id]);
    if (technologies && technologies.length > 0) {
      const uniqueTechnologies = [...new Set(technologies.map(t => t.trim()))];
      const techValues = uniqueTechnologies.map(tech => [id, tech]);
      await db.query("INSERT INTO user_project_technologies (user_project_id, technology_name) VALUES ?", [techValues]);
    }
    console.log("✅ Updated project for user ID:", req.user.id, "Project ID:", id, "Title:", title, "Technologies:", technologies || []);
    res.status(200).json({ message: "Project updated successfully" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      console.log("❌ Duplicate technology entry for project ID:", id);
      return res.status(400).json({ error: "Duplicate technology for this project" });
    }
    console.error("❌ Error updating project:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

// DELETE /api/userprojects/:id - Delete a project
router.delete("/:id", authenticateToken, async (req, res) => {
  console.log("📥 Received DELETE /api/userprojects request for user ID:", req.user.id, new Date().toISOString());
  const { id } = req.params;
  console.log("Project ID to delete:", id);
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
      "DELETE FROM user_projects WHERE id = ? AND user_profile_id = ?",
      [id, profile[0].id]
    );
    if (result.affectedRows === 0) {
      console.log("❌ Project not found for user ID:", req.user.id, "ID:", id);
      return res.status(404).json({ error: "Project not found" });
    }
    console.log("✅ Deleted project for user ID:", req.user.id, "ID:", id);
    res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting project:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

// POST /api/userprojects/:id/technologies - Add technologies to a project
router.post("/:id/technologies", authenticateToken, async (req, res) => {
  console.log("📥 Received POST /api/userprojects/:id/technologies request for user ID:", req.user.id, new Date().toISOString());
  const { id } = req.params;
  const { technologies } = req.body;
  console.log("Project ID:", id, "Request body:", req.body);
  if (!id || isNaN(id)) {
    console.log("❌ Validation error: id is required and must be a number");
    return res.status(400).json({ errors: ["id is required and must be a number"] });
  }
  if (!technologies || !Array.isArray(technologies) || technologies.some(t => typeof t !== "string" || t.trim() === "")) {
    console.log("❌ Validation error: technologies must be an array of non-empty strings");
    return res.status(400).json({ errors: ["technologies must be an array of non-empty strings"] });
  }
  try {
    const [profile] = await db.query("SELECT id FROM user_profiles WHERE user_id = ?", [req.user.id]);
    if (profile.length === 0) {
      console.log("❌ User profile not found for user ID:", req.user.id);
      return res.status(404).json({ error: "User profile not found" });
    }
    const [project] = await db.query("SELECT id FROM user_projects WHERE id = ? AND user_profile_id = ?", [id, profile[0].id]);
    if (project.length === 0) {
      console.log("❌ Project not found for user ID:", req.user.id, "ID:", id);
      return res.status(404).json({ error: "Project not found" });
    }
    const uniqueTechnologies = [...new Set(technologies.map(t => t.trim()))];
    const techValues = uniqueTechnologies.map(tech => [id, tech]);
    await db.query("INSERT INTO user_project_technologies (user_project_id, technology_name) VALUES ?", [techValues]);
    console.log("✅ Added technologies for user ID:", req.user.id, "Project ID:", id, "Technologies:", uniqueTechnologies);
    res.status(201).json({ message: "Technologies added successfully" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      console.log("❌ Duplicate technology entry for project ID:", id);
      return res.status(400).json({ error: "Duplicate technology for this project" });
    }
    console.error("❌ Error adding technologies:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

// DELETE /api/userprojects/:id/technologies/:technologyName - Delete a technology from a project
router.delete("/:id/technologies/:technologyName", authenticateToken, async (req, res) => {
  console.log("📥 Received DELETE /api/userprojects/:id/technologies request for user ID:", req.user.id, new Date().toISOString());
  const { id, technologyName } = req.params;
  console.log("Project ID:", id, "Technology to delete:", technologyName);
  if (!id || isNaN(id)) {
    console.log("❌ Validation error: id is required and must be a number");
    return res.status(400).json({ errors: ["id is required and must be a number"] });
  }
  if (!technologyName || typeof technologyName !== "string" || technologyName.trim() === "") {
    console.log("❌ Validation error: technologyName is required");
    return res.status(400).json({ errors: ["technologyName is required"] });
  }
  try {
    const [profile] = await db.query("SELECT id FROM user_profiles WHERE user_id = ?", [req.user.id]);
    if (profile.length === 0) {
      console.log("❌ User profile not found for user ID:", req.user.id);
      return res.status(404).json({ error: "User profile not found" });
    }
    const [project] = await db.query("SELECT id FROM user_projects WHERE id = ? AND user_profile_id = ?", [id, profile[0].id]);
    if (project.length === 0) {
      console.log("❌ Project not found for user ID:", req.user.id, "ID:", id);
      return res.status(404).json({ error: "Project not found" });
    }
    const [result] = await db.query(
      "DELETE FROM user_project_technologies WHERE user_project_id = ? AND technology_name = ?",
      [id, technologyName.trim()]
    );
    if (result.affectedRows === 0) {
      console.log("❌ Technology not found for project ID:", id, "Technology:", technologyName);
      return res.status(404).json({ error: "Technology not found" });
    }
    console.log("✅ Deleted technology for user ID:", req.user.id, "Project ID:", id, "Technology:", technologyName);
    res.status(200).json({ message: "Technology deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting technology:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

export default router;