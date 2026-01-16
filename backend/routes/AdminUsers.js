import express from "express";
import db from "../config/database.js";
import { authenticateAdmin } from "./AdminAuth.js";

const router = express.Router();

// Get all users with pagination and filters
router.get("/", authenticateAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const userType = req.query.userType;
    const q = (req.query.q || '').trim(); // search query for name or email

    // Select commonly needed fields and alias full_name to name to match frontend
    let baseQuery = `FROM users u`;
    const whereClauses = [];
    const params = [];

    if (userType) {
      whereClauses.push('u.user_type = ?');
      params.push(userType);
    }

    if (q) {
      whereClauses.push('(u.full_name LIKE ? OR u.email LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const dataQuery = `SELECT u.id, u.full_name as name, u.email, u.user_type, u.mobile_number, u.company_name, u.work_status, u.created_at ${baseQuery} ${whereSql} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;

    const countQuery = `SELECT COUNT(*) as total ${baseQuery} ${whereSql}`;

    // push pagination params for data query
    const dataParams = params.slice();
    dataParams.push(limit, offset);

    const [users] = await db.query(dataQuery, dataParams);
    const [totalCount] = await db.query(countQuery, params);

    res.json({
      users,
      pagination: {
        total: totalCount[0].total,
        page,
        limit,
        pages: Math.ceil(totalCount[0].total / limit)
      }
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get user details with their profile info
router.get("/:id", authenticateAdmin, async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT u.id, u.full_name as name, u.email, u.user_type, u.mobile_number, u.company_name, u.work_status, u.created_at,
       p.headline, p.summary,
       GROUP_CONCAT(DISTINCT s.skill) as skills
       FROM users u
       LEFT JOIN user_profiles p ON u.id = p.user_id
       LEFT JOIN user_skills s ON u.id = s.user_id
       WHERE u.id = ?
       GROUP BY u.id`,
      [req.params.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = users[0];
    if (user.skills) {
      user.skills = user.skills.split(',').filter(Boolean);
    } else {
      user.skills = [];
    }

    res.json(user);
  } catch (error) {
    console.error("Get user details error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/:id", authenticateAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    // Delete user from database (this will cascade delete related records if configured)
    const [result] = await db.query("DELETE FROM users WHERE id = ?", [userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
