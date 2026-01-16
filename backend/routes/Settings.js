import express from 'express'
import db from '../config/database.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const router = express.Router()

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Access token required' })
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')
    req.user = decoded
    next()
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' })
  }
}

// GET /api/settings - fetch user settings/profile
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    // Adjusted to match actual schema: mobile_number and send_updates columns
    const [rows] = await db.query('SELECT id, full_name, email, mobile_number, company_name, send_updates FROM users WHERE id = ? LIMIT 1', [userId])
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' })

    const user = rows[0]
    // Map DB columns to the frontend-friendly shape. Frontend expects `mobile` and `communication_preferences`.
    const communication_preferences = { emailNotifications: !!user.send_updates }

    return res.json({
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      mobile: user.mobile_number,
      company_name: user.company_name,
      communication_preferences,
    })
  } catch (err) {
    console.error('Settings fetch error:', err)
    res.status(500).json({ error: 'Failed to fetch settings' })
  }
})

// PUT /api/settings/account - update basic account info
router.put('/account', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const { full_name, email, mobile, company_name } = req.body

    if (!email) return res.status(400).json({ error: 'Email is required' })

    // check email uniqueness
    const [existing] = await db.query('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1', [email, userId])
    if (existing.length > 0) return res.status(400).json({ error: 'Email already in use' })

    // Update account info — mobile_number column used in DB
    const [result] = await db.query(
      'UPDATE users SET full_name = ?, email = ?, mobile_number = ?, company_name = ? WHERE id = ?',
      [full_name || null, email, mobile || null, company_name || null, userId]
    )
    
    console.log(`[Settings] Account updated for user ${userId}:`, { full_name, email, mobile, company_name, result })
    
    // Return the updated data to confirm changes
    const [updated] = await db.query(
      'SELECT id, full_name, email, mobile_number, company_name, send_updates FROM users WHERE id = ? LIMIT 1',
      [userId]
    )
    
    if (updated.length === 0) return res.status(404).json({ error: 'User not found after update' })
    
    const user = updated[0]
    const communication_preferences = { emailNotifications: !!user.send_updates }
    
    return res.json({
      message: 'Account updated',
      data: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        mobile: user.mobile_number,
        company_name: user.company_name,
        communication_preferences,
      }
    })
  } catch (err) {
    console.error('Settings account update error:', err)
    res.status(500).json({ error: 'Failed to update account: ' + err.message })
  }
})

// PUT /api/settings/password - change password
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'currentPassword and newPassword required' })

    const [rows] = await db.query('SELECT id, password FROM users WHERE id = ? LIMIT 1', [userId])
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' })

    console.log(`[Settings] Password change attempt for user ${userId}`)
    
    const match = await bcrypt.compare(currentPassword, rows[0].password)
    if (!match) {
      console.log(`[Settings] Current password mismatch for user ${userId}`)
      return res.status(403).json({ error: 'Current password incorrect' })
    }

    const hashed = await bcrypt.hash(newPassword, 10)
    const [result] = await db.query('UPDATE users SET password = ? WHERE id = ?', [hashed, userId])
    
    console.log(`[Settings] Password changed for user ${userId}:`, result)
    
    return res.json({ message: 'Password changed successfully' })
  } catch (err) {
    console.error('Settings password change error:', err)
    res.status(500).json({ error: 'Failed to change password: ' + err.message })
  }
})

// PUT /api/settings/communication - update communication preferences
router.put('/communication', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const { communication_preferences } = req.body
    // Map incoming communication_preferences to the `send_updates` tinyint column in the users table
    const emailNotifications = communication_preferences && communication_preferences.emailNotifications
    const send_updates = emailNotifications ? 1 : 0
    
    const [result] = await db.query('UPDATE users SET send_updates = ? WHERE id = ?', [send_updates, userId])
    
    console.log(`[Settings] Communication preferences updated for user ${userId}:`, { emailNotifications, send_updates, result })
    
    return res.json({ 
      message: 'Communication preferences updated',
      data: { communication_preferences: { emailNotifications } }
    })
  } catch (err) {
    console.error('Settings communication update error:', err)
    res.status(500).json({ error: 'Failed to update communication preferences: ' + err.message })
  }
})

// DELETE /api/settings/account - delete user account permanently
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const { password } = req.body

    if (!password) return res.status(400).json({ error: 'Password required to delete account' })

    // Verify password before deletion
    const [rows] = await db.query('SELECT id, password FROM users WHERE id = ? LIMIT 1', [userId])
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' })

    const match = await bcrypt.compare(password, rows[0].password)
    if (!match) {
      console.log(`[Settings] Failed account deletion attempt for user ${userId} - incorrect password`)
      return res.status(403).json({ error: 'Password incorrect - account not deleted' })
    }

    // Delete the user account
    const [result] = await db.query('DELETE FROM users WHERE id = ?', [userId])
    
    console.log(`[Settings] Account deleted for user ${userId}:`, result)
    
    return res.json({ 
      message: 'Account deleted successfully',
      data: { deleted: true }
    })
  } catch (err) {
    console.error('Settings account deletion error:', err)
    res.status(500).json({ error: 'Failed to delete account: ' + err.message })
  }
})

export default router
