import express from "express";
import db from "../config/database.js";
import jwt from "jsonwebtoken";

const router = express.Router();

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

router.get("/", authenticateToken, async (req, res) => {
  console.log("📥 Received GET /api/userlanguages request for user ID:", req.user.id, new Date().toISOString());
  try {
    const [profile] = await db.query("SELECT id FROM user_profiles WHERE user_id = ?", [req.user.id]);
    if (profile.length === 0) {
      console.log("❌ User profile not found for user ID:", req.user.id);
      return res.status(404).json({ error: "User profile not found" });
    }

    const [languages] = await db.query("SELECT language_name, proficiency, created_at FROM user_languages WHERE user_profile_id = ?", [profile[0].id]);
    console.log("✅ Fetched languages for user ID:", req.user.id, "Data:", languages);
    res.status(200).json(languages);
  } catch (error) {
    console.error("❌ Error fetching languages:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

router.post("/", authenticateToken, async (req, res) => {
  console.log("📥 Received POST /api/userlanguages request for user ID:", req.user.id, new Date().toISOString());
  const { languageName, proficiency } = req.body;
  console.log("Request body:", req.body);

  const requiredFields = [
    { field: languageName, name: "languageName" },
    { field: proficiency, name: "proficiency" },
  ];

  const errors = [];
  requiredFields.forEach(({ field, name }) => {
    if (!field || typeof field !== "string" || field.trim() === "") {
      errors.push(`${name} is required`);
    }
  });

  const allowedProficiencies = ['Beginner', 'Intermediate', 'Advanced', 'Native'];
  if (proficiency && !allowedProficiencies.includes(proficiency)) {
    errors.push("proficiency must be one of: Beginner, Intermediate, Advanced, Native");
  }

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
      "INSERT INTO user_languages (user_profile_id, language_name, proficiency) VALUES (?, ?, ?)",
      [profile[0].id, languageName.trim(), proficiency]
    );
    console.log("✅ Added language for user ID:", req.user.id, "Language:", languageName, "Proficiency:", proficiency);
    res.status(201).json({ message: "Language added successfully" });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      console.log("❌ Duplicate language entry for user ID:", req.user.id, "Language:", languageName);
      return res.status(400).json({ error: "Language already exists for this user" });
    }
    console.error("❌ Error adding language:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

router.delete("/:languageName", authenticateToken, async (req, res) => {
  console.log("📥 Received DELETE /api/userlanguages request for user ID:", req.user.id, new Date().toISOString());
  const { languageName } = req.params;
  console.log("Language to delete:", languageName);

  if (!languageName || typeof languageName !== "string" || languageName.trim() === "") {
    console.log("❌ Validation error: languageName is required");
    return res.status(400).json({ errors: ["languageName is required"] });
  }

  try {
    const [profile] = await db.query("SELECT id FROM user_profiles WHERE user_id = ?", [req.user.id]);
    if (profile.length === 0) {
      console.log("❌ User profile not found for user ID:", req.user.id);
      return res.status(404).json({ error: "User profile not found" });
    }

    const [result] = await db.query(
      "DELETE FROM user_languages WHERE user_profile_id = ? AND language_name = ?",
      [profile[0].id, languageName.trim()]
    );
    if (result.affectedRows === 0) {
      console.log("❌ Language not found for user ID:", req.user.id, "Language:", languageName);
      return res.status(404).json({ error: "Language not found" });
    }

    console.log("✅ Deleted language for user ID:", req.user.id, "Language:", languageName);
    res.status(200).json({ message: "Language deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting language:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

export default router;