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

// GET /api/useraccomplishments - Fetch all accomplishments
router.get("/", authenticateToken, async (req, res) => {
  console.log("📥 Received GET /api/useraccomplishments request for user ID:", req.user.id, new Date().toISOString());
  try {
    const [profile] = await db.query("SELECT id FROM user_profiles WHERE user_id = ?", [req.user.id]);
    if (profile.length === 0) {
      console.log("❌ User profile not found for user ID:", req.user.id);
      return res.status(404).json({ error: "User profile not found" });
    }
    const userProfileId = profile[0].id;
    const [certifications] = await db.query(
      "SELECT id, name, issuer, year, created_at FROM user_accomplishments_certifications WHERE user_profile_id = ?",
      [userProfileId]
    );
    const [awards] = await db.query(
      "SELECT id, title AS name, issuer, year, created_at FROM user_accomplishments_awards WHERE user_profile_id = ?",
      [userProfileId]
    );
    const [clubs] = await db.query(
      "SELECT id, name, role, year, created_at FROM user_accomplishments_clubs_committees WHERE user_profile_id = ?",
      [userProfileId]
    );
    console.log("✅ Fetched accomplishments for user ID:", req.user.id);
    res.status(200).json({ certifications, awards, clubs });
  } catch (error) {
    console.error("❌ Error fetching accomplishments:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

// POST /api/useraccomplishments/certifications - Add a certification
router.post("/certifications", authenticateToken, async (req, res) => {
  console.log("📥 Received POST /api/useraccomplishments/certifications request for user ID:", req.user.id, new Date().toISOString());
  const { name, issuer, year } = req.body;
  console.log("Request body:", req.body);
  const errors = [];
  if (!name || typeof name !== "string" || name.trim() === "") errors.push("name is required");
  if (!issuer || typeof issuer !== "string" || issuer.trim() === "") errors.push("issuer is required");
  if (year && (isNaN(year) || year < 1900 || year > new Date().getFullYear())) errors.push("year must be a valid year between 1900 and current year");
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
      "INSERT INTO user_accomplishments_certifications (user_profile_id, name, issuer, year) VALUES (?, ?, ?, ?)",
      [profile[0].id, name.trim(), issuer.trim(), year || null]
    );
    console.log("✅ Added certification for user ID:", req.user.id, "Name:", name);
    res.status(201).json({ message: "Certification added successfully" });
  } catch (error) {
    console.error("❌ Error adding certification:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

// PUT /api/useraccomplishments/certifications/:id - Update a certification
router.put("/certifications/:id", authenticateToken, async (req, res) => {
  console.log("📥 Received PUT /api/useraccomplishments/certifications request for user ID:", req.user.id, new Date().toISOString());
  const { id } = req.params;
  const { name, issuer, year } = req.body;
  console.log("Certification ID to update:", id, "Request body:", req.body);
  const errors = [];
  if (!id || isNaN(id)) errors.push("id is required and must be a number");
  if (!name || typeof name !== "string" || name.trim() === "") errors.push("name is required");
  if (!issuer || typeof issuer !== "string" || issuer.trim() === "") errors.push("issuer is required");
  if (year && (isNaN(year) || year < 1900 || year > new Date().getFullYear())) errors.push("year must be a valid year between 1900 and current year");
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
      "UPDATE user_accomplishments_certifications SET name = ?, issuer = ?, year = ? WHERE id = ? AND user_profile_id = ?",
      [name.trim(), issuer.trim(), year || null, id, profile[0].id]
    );
    if (result.affectedRows === 0) {
      console.log("❌ Certification not found for user ID:", req.user.id, "ID:", id);
      return res.status(404).json({ error: "Certification not found" });
    }
    console.log("✅ Updated certification for user ID:", req.user.id, "ID:", id);
    res.status(200).json({ message: "Certification updated successfully" });
  } catch (error) {
    console.error("❌ Error updating certification:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

// DELETE /api/useraccomplishments/certifications/:id - Delete a certification
router.delete("/certifications/:id", authenticateToken, async (req, res) => {
  console.log("📥 Received DELETE /api/useraccomplishments/certifications request for user ID:", req.user.id, new Date().toISOString());
  const { id } = req.params;
  console.log("Certification ID to delete:", id);
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
      "DELETE FROM user_accomplishments_certifications WHERE id = ? AND user_profile_id = ?",
      [id, profile[0].id]
    );
    if (result.affectedRows === 0) {
      console.log("❌ Certification not found for user ID:", req.user.id, "ID:", id);
      return res.status(404).json({ error: "Certification not found" });
    }
    console.log("✅ Deleted certification for user ID:", req.user.id, "ID:", id);
    res.status(200).json({ message: "Certification deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting certification:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

// POST /api/useraccomplishments/awards - Add an award
router.post("/awards", authenticateToken, async (req, res) => {
  console.log("📥 Received POST /api/useraccomplishments/awards request for user ID:", req.user.id, new Date().toISOString());
  const { title, issuer, year } = req.body;
  console.log("Request body:", req.body);
  const errors = [];
  if (!title || typeof title !== "string" || title.trim() === "") errors.push("title is required");
  if (!issuer || typeof issuer !== "string" || issuer.trim() === "") errors.push("issuer is required");
  if (year && (isNaN(year) || year < 1900 || year > new Date().getFullYear())) errors.push("year must be a valid year between 1900 and current year");
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
      "INSERT INTO user_accomplishments_awards (user_profile_id, title, issuer, year) VALUES (?, ?, ?, ?)",
      [profile[0].id, title.trim(), issuer.trim(), year || null]
    );
    console.log("✅ Added award for user ID:", req.user.id, "Title:", title);
    res.status(201).json({ message: "Award added successfully" });
  } catch (error) {
    console.error("❌ Error adding award:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

// PUT /api/useraccomplishments/awards/:id - Update an award
router.put("/awards/:id", authenticateToken, async (req, res) => {
  console.log("📥 Received PUT /api/useraccomplishments/awards request for user ID:", req.user.id, new Date().toISOString());
  const { id } = req.params;
  const { title, issuer, year } = req.body;
  console.log("Award ID to update:", id, "Request body:", req.body);
  const errors = [];
  if (!id || isNaN(id)) errors.push("id is required and must be a number");
  if (!title || typeof title !== "string" || title.trim() === "") errors.push("title is required");
  if (!issuer || typeof issuer !== "string" || issuer.trim() === "") errors.push("issuer is required");
  if (year && (isNaN(year) || year < 1900 || year > new Date().getFullYear())) errors.push("year must be a valid year between 1900 and current year");
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
      "UPDATE user_accomplishments_awards SET title = ?, issuer = ?, year = ? WHERE id = ? AND user_profile_id = ?",
      [title.trim(), issuer.trim(), year || null, id, profile[0].id]
    );
    if (result.affectedRows === 0) {
      console.log("❌ Award not found for user ID:", req.user.id, "ID:", id);
      return res.status(404).json({ error: "Award not found" });
    }
    console.log("✅ Updated award for user ID:", req.user.id, "ID:", id);
    res.status(200).json({ message: "Award updated successfully" });
  } catch (error) {
    console.error("❌ Error updating award:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

// DELETE /api/useraccomplishments/awards/:id - Delete an award
router.delete("/awards/:id", authenticateToken, async (req, res) => {
  console.log("📥 Received DELETE /api/useraccomplishments/awards request for user ID:", req.user.id, new Date().toISOString());
  const { id } = req.params;
  console.log("Award ID to delete:", id);
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
      "DELETE FROM user_accomplishments_awards WHERE id = ? AND user_profile_id = ?",
      [id, profile[0].id]
    );
    if (result.affectedRows === 0) {
      console.log("❌ Award not found for user ID:", req.user.id, "ID:", id);
      return res.status(404).json({ error: "Award not found" });
    }
    console.log("✅ Deleted award for user ID:", req.user.id, "ID:", id);
    res.status(200).json({ message: "Award deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting award:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

// POST /api/useraccomplishments/clubs - Add a club/committee
router.post("/clubs", authenticateToken, async (req, res) => {
  console.log("📥 Received POST /api/useraccomplishments/clubs request for user ID:", req.user.id, new Date().toISOString());
  const { name, role, year } = req.body;
  console.log("Request body:", req.body);
  const errors = [];
  if (!name || typeof name !== "string" || name.trim() === "") errors.push("name is required");
  if (role && (typeof role !== "string" || role.trim() === "")) errors.push("role must be a non-empty string");
  if (year && (isNaN(year) || year < 1900 || year > new Date().getFullYear())) errors.push("year must be a valid year between 1900 and current year");
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
      "INSERT INTO user_accomplishments_clubs_committees (user_profile_id, name, role, year) VALUES (?, ?, ?, ?)",
      [profile[0].id, name.trim(), role ? role.trim() : null, year || null]
    );
    console.log("✅ Added club/committee for user ID:", req.user.id, "Name:", name);
    res.status(201).json({ message: "Club/Committee added successfully" });
  } catch (error) {
    console.error("❌ Error adding club/committee:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

// PUT /api/useraccomplishments/clubs/:id - Update a club/committee
router.put("/clubs/:id", authenticateToken, async (req, res) => {
  console.log("📥 Received PUT /api/useraccomplishments/clubs request for user ID:", req.user.id, new Date().toISOString());
  const { id } = req.params;
  const { name, role, year } = req.body;
  console.log("Club/Committee ID to update:", id, "Request body:", req.body);
  const errors = [];
  if (!id || isNaN(id)) errors.push("id is required and must be a number");
  if (!name || typeof name !== "string" || name.trim() === "") errors.push("name is required");
  if (role && (typeof role !== "string" || role.trim() === "")) errors.push("role must be a non-empty string");
  if (year && (isNaN(year) || year < 1900 || year > new Date().getFullYear())) errors.push("year must be a valid year between 1900 and current year");
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
      "UPDATE user_accomplishments_clubs_committees SET name = ?, role = ?, year = ? WHERE id = ? AND user_profile_id = ?",
      [name.trim(), role ? role.trim() : null, year || null, id, profile[0].id]
    );
    if (result.affectedRows === 0) {
      console.log("❌ Club/Committee not found for user ID:", req.user.id, "ID:", id);
      return res.status(404).json({ error: "Club/Committee not found" });
    }
    console.log("✅ Updated club/committee for user ID:", req.user.id, "ID:", id);
    res.status(200).json({ message: "Club/Committee updated successfully" });
  } catch (error) {
    console.error("❌ Error updating club/committee:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

// DELETE /api/useraccomplishments/clubs/:id - Delete a club/committee
router.delete("/clubs/:id", authenticateToken, async (req, res) => {
  console.log("📥 Received DELETE /api/useraccomplishments/clubs request for user ID:", req.user.id, new Date().toISOString());
  const { id } = req.params;
  console.log("Club/Committee ID to delete:", id);
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
      "DELETE FROM user_accomplishments_clubs_committees WHERE id = ? AND user_profile_id = ?",
      [id, profile[0].id]
    );
    if (result.affectedRows === 0) {
      console.log("❌ Club/Committee not found for user ID:", req.user.id, "ID:", id);
      return res.status(404).json({ error: "Club/Committee not found" });
    }
    console.log("✅ Deleted club/committee for user ID:", req.user.id, "ID:", id);
    res.status(200).json({ message: "Club/Committee deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting club/committee:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

export default router;