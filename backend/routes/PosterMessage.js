import express from "express";
import db from "../config/database.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// Middleware to verify JWT token for authenticated routes
const authenticateToken = (req, res, next) => {
  console.log("🔍 Authenticating token...");
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
    console.log("✅ Token authenticated, user:", decoded.email, "ID:", decoded.id, "Type:", decoded.userType);
    next();
  } catch (error) {
    console.error("❌ Token verification failed:", error.message);
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

// POST /api/messages - Send a new message (requires auth, job_poster to job_seeker)
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log("📥 Received POST /api/messages request");
    console.log("Request body:", req.body);  // Log incoming data
    console.log("User from token:", req.user);  // Log decoded user

    if (req.user.userType !== "job_poster") {
      console.log("❌ User type not job_poster:", req.user.userType);
      return res.status(403).json({ error: "Only job posters can send messages" });
    }

    const { to_user_id, message } = req.body;

    // Validate required fields
    if (!to_user_id || !message || message.trim().length === 0) {
      console.log("❌ Missing required fields:", { to_user_id, message: message?.trim() });
      return res.status(400).json({ error: 'Missing required fields: to_user_id, message' });
    }

    const trimmedMessage = message.trim();

    console.log("🔍 Checking recipient existence and type...");
    // Verify the recipient exists and is a job_seeker
    const [recipient] = await db.query(
      'SELECT id, user_type FROM users WHERE id = ?',
      [to_user_id]
    );
    console.log("Found recipient:", recipient.length, recipient[0] || "None");

    if (recipient.length === 0) {
      console.log("❌ Recipient not found for ID:", to_user_id);
      return res.status(404).json({ error: 'Recipient not found' });
    }

    if (recipient[0].user_type !== 'job_seeker') {
      console.log("❌ Recipient is not job_seeker:", recipient[0].user_type);
      return res.status(403).json({ error: 'Can only send messages to job seekers' });
    }

    // Prevent self-messaging
    if (recipient[0].id === req.user.id) {
      console.log("❌ Self-messaging attempt");
      return res.status(400).json({ error: 'Cannot send message to yourself' });
    }

    console.log("📤 Executing database insert query...");
    const [result] = await db.query(
      'INSERT INTO messages (from_user_id, to_user_id, message, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
      [req.user.id, to_user_id, trimmedMessage]
    );

    console.log("✅ Message inserted, ID:", result.insertId, "Affected:", result.affectedRows);

    if (result.affectedRows === 0) {
      return res.status(500).json({ error: 'Failed to send message' });
    }

    res.status(201).json({ 
      success: true, 
      message: 'Message sent successfully',
      id: result.insertId 
    });
  } catch (error) {
    console.error('❌ Error sending message:', error.message, error.code, error.sqlMessage || "No SQL message");
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(404).json({ error: 'Invalid recipient ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/messages/:id - Edit and resend a message (requires auth, only sender)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    console.log("📥 Received PUT /api/messages/:id request, id:", req.params.id);
    console.log("Request body:", req.body);

    if (req.user.userType !== "job_poster") {
      console.log("❌ User type not job_poster:", req.user.userType);
      return res.status(403).json({ error: "Only job posters can edit messages" });
    }

    const { message } = req.body;
    const { id } = req.params;

    if (!message || message.trim().length === 0) {
      console.log("❌ Missing required field: message");
      return res.status(400).json({ error: 'Missing required field: message' });
    }

    const trimmedMessage = message.trim();

    // Verify the message exists and belongs to the sender
    const [existingMessage] = await db.query(
      'SELECT id, from_user_id FROM messages WHERE id = ?',
      [id]
    );
    console.log("Found message:", existingMessage.length, existingMessage[0] || "None");

    if (existingMessage.length === 0) {
      console.log("❌ Message not found for ID:", id);
      return res.status(404).json({ error: 'Message not found' });
    }

    const msg = existingMessage[0];
    if (msg.from_user_id !== req.user.id) {
      console.log("❌ Not the sender:", msg.from_user_id, "vs", req.user.id);
      return res.status(403).json({ error: 'Can only edit your own messages' });
    }

    console.log("📤 Executing database update query...");
    const [result] = await db.query(
      'UPDATE messages SET message = ?, updated_at = NOW() WHERE id = ?',
      [trimmedMessage, id]
    );

    console.log("✅ Message updated, affected rows:", result.affectedRows);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ 
      success: true, 
      message: 'Message updated and resent successfully' 
    });
  } catch (error) {
    console.error('❌ Error updating message:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/messages - Get all messages for the current user (requires auth)
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log("📥 Received GET /api/messages request for current user");
    console.log("User ID:", req.user.id, "Type param:", req.query.type);

    const { type } = req.query; // 'sent', 'received', 'all' (default 'all')
    const currentUserId = req.user.id;
    let whereClause = '';
    let whereParams = [];

    if (type === 'sent') {
      whereClause = 'WHERE m.from_user_id = ?';
      whereParams = [currentUserId];
    } else if (type === 'received') {
      whereClause = 'WHERE m.to_user_id = ?';
      whereParams = [currentUserId];
    } else {
      whereClause = 'WHERE m.from_user_id = ? OR m.to_user_id = ?';
      whereParams = [currentUserId, currentUserId];
    }

    console.log("📤 Executing database query with type:", type || 'all');
    const query = `
      SELECT m.id, m.from_user_id, m.to_user_id, m.message, m.created_at, m.updated_at,
             CASE 
               WHEN m.from_user_id = ? THEN COALESCE(u_to.email, 'Unknown User')
               ELSE COALESCE(u_from.email, 'Unknown User') 
             END as sender_name,
             CASE 
               WHEN m.from_user_id = ? THEN COALESCE(u_to.email, 'No email')
               ELSE COALESCE(u_from.email, 'No email') 
             END as sender_email
      FROM messages m
      LEFT JOIN users u_from ON m.from_user_id = u_from.id
      LEFT JOIN users u_to ON m.to_user_id = u_to.id
      ${whereClause}
      ORDER BY m.updated_at DESC, m.created_at DESC
    `;
    const allParams = [currentUserId, currentUserId, ...whereParams];
    const [rows] = await db.query(query, allParams);
    console.log("✅ Fetched messages:", rows.length);

    res.json(rows);
  } catch (error) {
    console.error('❌ Error fetching messages:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/messages/conversation/:userId - Get messages between current user and specific user (requires auth)
router.get('/conversation/:userId', authenticateToken, async (req, res) => {
  try {
    console.log("📥 Received GET /api/messages/conversation/:userId request, userId:", req.params.userId);

    const { userId } = req.params;
    const currentUserId = req.user.id;

    // Verify the target user exists
    const [targetUser] = await db.query(
      'SELECT id, user_type FROM users WHERE id = ?',
      [userId]
    );

    if (targetUser.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log("📤 Executing database query for conversation...");
    const query = `
      SELECT m.id, m.from_user_id, m.to_user_id, m.message, m.created_at, m.updated_at,
             CASE 
               WHEN m.from_user_id = ? THEN COALESCE(u_to.email, 'Unknown User')
               ELSE COALESCE(u_from.email, 'Unknown User') 
             END as sender_name,
             CASE 
               WHEN m.from_user_id = ? THEN COALESCE(u_to.email, 'No email')
               ELSE COALESCE(u_from.email, 'No email') 
             END as sender_email
      FROM messages m
      LEFT JOIN users u_from ON m.from_user_id = u_from.id
      LEFT JOIN users u_to ON m.to_user_id = u_to.id
      WHERE (m.from_user_id = ? AND m.to_user_id = ?) OR (m.from_user_id = ? AND m.to_user_id = ?)
      ORDER BY m.created_at ASC
    `;
    const [rows] = await db.query(query, [currentUserId, currentUserId, currentUserId, userId, userId, currentUserId]);
    console.log("✅ Fetched conversation messages:", rows.length);

    res.json(rows);
  } catch (error) {
    console.error('❌ Error fetching conversation messages:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;