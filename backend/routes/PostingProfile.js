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
    if (decoded.userType !== "job_poster") {
      console.log("❌ User is not a job_poster");
      return res.status(403).json({ error: "Only job posters can perform this action" });
    }
    req.user = decoded;
    console.log("✅ Token authenticated, user:", decoded.email, "user_id:", decoded.id);
    next();
  } catch (error) {
    console.error("❌ Token verification failed:", error.message);
    return res.status(403).json({ error: "Invalid or expired token", details: error.message });
  }
};

router.get("/", authenticateToken, async (req, res) => {
  console.log("📥 Received GET /api/postingprofile request for user ID:", req.user.id, new Date().toISOString());
  try {
    const [profiles] = await db.query("SELECT * FROM company_profiles WHERE user_id = ?", [req.user.id]);
    if (profiles.length === 0) {
      console.log("❌ Profile not found for user ID:", req.user.id, "Creating default profile...");
      const [user] = await db.query("SELECT email FROM users WHERE id = ?", [req.user.id]);
      if (user.length === 0) throw new Error("User not found in users table");
      const defaultProfile = {
        user_id: req.user.id,
        company_name: `${user[0].email.split('@')[0]} Corp`,
        industry: "Unknown",
        location: "Unknown",
        email: user[0].email,
        phone: "+1 (555) 123-4567",
        website: "www.example.com",
        description: "Default company description",
        employees: "",
        founded: "",
        created_at: new Date(),
        updated_at: new Date(),
      };
      await db.query(
        "INSERT INTO company_profiles (user_id, company_name, industry, location, email, phone, website, description, employees, founded, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          defaultProfile.user_id,
          defaultProfile.company_name,
          defaultProfile.industry,
          defaultProfile.location,
          defaultProfile.email,
          defaultProfile.phone,
          defaultProfile.website,
          defaultProfile.description,
          defaultProfile.employees,
          defaultProfile.founded,
          defaultProfile.created_at,
          defaultProfile.updated_at,
        ]
      );
      const [newProfile] = await db.query("SELECT * FROM company_profiles WHERE user_id = ?", [req.user.id]);
      console.log("✅ Created default profile for user ID:", req.user.id, "Data:", newProfile[0]);
      return res.status(200).json(newProfile[0]);
    }
    console.log("✅ Fetched profile for user ID:", req.user.id, "Data:", profiles[0]);
    res.status(200).json(profiles[0]);
  } catch (error) {
    console.error("❌ Error fetching profile:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

router.put("/", authenticateToken, async (req, res) => {
  console.log("📥 Received PUT /api/postingprofile request for user ID:", req.user.id, new Date().toISOString());
  const { companyName, industry, location, email, phone, website, description, employees, founded } = req.body;
  console.log("Request body:", req.body);

  const requiredFields = [
    { field: companyName, name: "companyName" },
    { field: industry, name: "industry" },
    { field: location, name: "location" },
    { field: email, name: "email" },
    { field: phone, name: "phone" },
    { field: website, name: "website" },
    { field: description, name: "description" },
  ];

  const errors = [];
  requiredFields.forEach(({ field, name }) => {
    if (!field || (typeof field === "string" && field.trim() === "")) {
      errors.push(`${name} is required`);
    }
  });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email)) {
    errors.push("email must be a valid email address");
  }

  const urlRegex = /^(https?:\/\/)?([\w-]+(\.[\w-]+)+\/?|localhost)(:\d+)?([/]?[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/;
  if (website && !urlRegex.test(website)) {
    errors.push("website must be a valid URL");
  }

  if (errors.length > 0) {
    console.log("❌ Validation errors:", errors, new Date().toISOString());
    return res.status(400).json({ errors });
  }
  console.log("✅ Validation passed", new Date().toISOString());

  try {
    const [result] = await db.query(
      `INSERT INTO company_profiles (
        user_id, company_name, industry, location, email, phone, website, description, employees, founded, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        company_name = ?, industry = ?, location = ?, email = ?, phone = ?, website = ?, description = ?, employees = ?, founded = ?, updated_at = NOW()`,
      [
        req.user.id,
        companyName,
        industry,
        location,
        email,
        phone,
        website,
        description,
        employees || null,
        founded || null,
        companyName,
        industry,
        location,
        email,
        phone,
        website,
        description,
        employees || null,
        founded || null,
      ]
    );
    console.log("✅ Profile updated for user ID:", req.user.id, new Date().toISOString());
    res.status(200).json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("❌ Error updating profile:", error.message, new Date().toISOString());
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    });
  }
});

export default router;