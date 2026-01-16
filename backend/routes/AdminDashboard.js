import express from "express";
import db from "../config/database.js";
import { authenticateAdmin } from "./AdminAuth.js";

const router = express.Router();

// Get dashboard statistics
router.get("/stats", authenticateAdmin, async (req, res) => {
  try {
    const stats = {};
    
    // 1. Get total jobs count
    const [activeJobs] = await db.query(
      "SELECT COUNT(*) as count FROM jobs"
    );
    stats.activeJobs = activeJobs[0].count;

    // 2. Get total users count by type
    const [users] = await db.query(
      "SELECT user_type, COUNT(*) as count FROM users GROUP BY user_type"
    );
    stats.users = users.reduce((acc, curr) => {
      acc[curr.user_type] = curr.count;
      return acc;
    }, {});

    // 3. Get total applications
    const [applications] = await db.query(
      "SELECT COUNT(*) as count FROM applications"
    );
    stats.totalApplications = applications[0].count;

    // --- NEW CODE START: Data for Charts ---

    // 4. Get Application Trends (Last 6 Months)
    // Grouping by Month (e.g., 'Jan', 'Feb')
    const [trends] = await db.query(`
      SELECT 
        DATE_FORMAT(created_at, '%b') as month, 
        COUNT(*) as count 
      FROM applications 
      WHERE created_at >= NOW() - INTERVAL 6 MONTH 
      GROUP BY DATE_FORMAT(created_at, '%Y-%m'), month 
      ORDER BY DATE_FORMAT(created_at, '%Y-%m') ASC
    `);
    stats.monthlyApplications = trends;

    // 5. Get Recruitment Funnel (By Status)
    // NOTE: This assumes your 'applications' table has a 'status' column.
    // If it doesn't, this query will fail. (See note below code)
    const [funnel] = await db.query(`
      SELECT status as stage, COUNT(*) as count 
      FROM applications 
      GROUP BY status
      ORDER BY count DESC
    `);
    stats.funnelData = funnel;

    // --- NEW CODE END ---

    // 6. Get recent activity (Recent Jobs)
    const [recentJobs] = await db.query(
      "SELECT id, job_title AS title, company_name, created_at FROM jobs ORDER BY created_at DESC LIMIT 5"
    );
    stats.recentJobs = recentJobs;

    // 7. Get recent activity (Recent Applications)
    const [recentApplications] = await db.query(
      `SELECT a.id, a.created_at, j.job_title AS title, u.full_name as applicant_name 
       FROM applications a 
       JOIN jobs j ON a.job_id = j.id 
       LEFT JOIN users u ON a.user_id = u.id 
       ORDER BY a.created_at DESC LIMIT 5`
    );
    stats.recentApplications = recentApplications;

    res.json(stats);
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard statistics" });
  }
});

export default router;