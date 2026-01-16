import express from "express";
import db from "../config/database.js"; // your MySQL pool

const router = express.Router();

// Get job recommendations for a specific user
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // 1️⃣ Get user profile
    const [profileRows] = await db.query(
      "SELECT id, preferred_location FROM user_profiles WHERE user_id = ?",
      [userId]
    );
    if (profileRows.length === 0) {
      return res.status(404).json({ message: "User profile not found" });
    }
    const profile = profileRows[0];

    // 2️⃣ Get user skills
    const [skillRows] = await db.query(
      "SELECT skill_name FROM user_skills WHERE user_profile_id = ?",
      [profile.id]
    );
    const userSkills = skillRows.map(row => row.skill_name.toLowerCase());

    // 3️⃣ Get all active jobs
    const [jobRows] = await db.query("SELECT * FROM jobs");

    // 4️⃣ Match jobs based on skills and location
    const recommendations = jobRows.filter(job => {
      const jobSkills = job.skills ? job.skills.split(",").map(s => s.trim().toLowerCase()) : [];
      const skillMatch = jobSkills.some(skill => userSkills.includes(skill));
      const locationMatch = job.job_location && profile.preferred_location &&
                            job.job_location.toLowerCase() === profile.preferred_location.toLowerCase();
      return skillMatch || locationMatch;
    });

    // 5️⃣ Return top 10 recommendations
    res.json({
      message: "Job recommendations fetched successfully",
      recommendations: recommendations.slice(0, 10)
    });

  } catch (error) {
    console.error("Error fetching recommendations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
