import express from 'express'
import db from '../config/database.js'
import jwt from 'jsonwebtoken'
import { parse } from 'url'

const router = express.Router()

// Authenticate token middleware (same pattern as other user routes)
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

// Helper: ensure user is job_poster
const requireJobPoster = (req, res, next) => {
  if (!req.user || req.user.userType !== 'job_poster') {
    return res.status(403).json({ error: 'Job poster access required' })
  }
  next()
}

// Helper: format date to MySQL format
const formatDateForSQL = (date) => {
  if (typeof date === 'string') date = new Date(date)
  return date.toISOString().slice(0, 19).replace('T', ' ')
}

// GET /api/analytics/one-click?period=yesterday|thisWeek|thisMonth
router.get('/one-click', authenticateToken, requireJobPoster, async (req, res) => {
  try {
    const { period = 'yesterday' } = req.query
    const now = new Date()
    let start, end

    // compute period start/end (end exclusive)
    if (period === 'thisWeek') {
      const day = now.getDay() || 7 // Monday=1..Sunday=7
      const monday = new Date(now)
      monday.setDate(now.getDate() - (day - 1))
      monday.setHours(0,0,0,0)
      start = monday
      end = new Date(now)
      end.setHours(23,59,59,999)
    } else if (period === 'thisMonth') {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date(now.getFullYear(), now.getMonth()+1, 0)
      end.setHours(23,59,59,999)
    } else {
      // yesterday
      start = new Date(now)
      start.setDate(now.getDate() - 1)
      start.setHours(0,0,0,0)
      end = new Date(now)
      end.setDate(now.getDate() - 1)
      end.setHours(23,59,59,999)
    }

    const userId = req.user.id
    const startSQL = formatDateForSQL(start)
    const endSQL = formatDateForSQL(end)

    // Total jobs by this poster in period
    const [jobsCountRows] = await db.query(
      'SELECT COUNT(*) as count FROM jobs WHERE user_id = ? AND created_at BETWEEN ? AND ?',
      [userId, startSQL, endSQL]
    )

    // Total applications for this poster in period
    const [appsCountRows] = await db.query(
      `SELECT COUNT(a.id) as count FROM applications a
         JOIN jobs j ON a.job_id = j.id
         WHERE j.user_id = ? AND a.created_at BETWEEN ? AND ?`,
      [userId, startSQL, endSQL]
    )

    // Applications by job with additional metrics
    const [appsByJob] = await db.query(
      `SELECT j.id as job_id, j.job_title as job_title, j.company_name, 
              COUNT(a.id) as applicationCount, j.created_at as jobCreatedAt
       FROM jobs j
       LEFT JOIN applications a ON a.job_id = j.id AND a.created_at BETWEEN ? AND ?
       WHERE j.user_id = ? AND j.created_at BETWEEN ? AND ?
       GROUP BY j.id ORDER BY applicationCount DESC`,
      [startSQL, endSQL, userId, startSQL, endSQL]
    )

    res.json({
      period,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      totalJobs: jobsCountRows[0].count || 0,
      totalApplications: appsCountRows[0].count || 0,
      applicationsByJob: appsByJob,
      generatedAt: new Date().toISOString()
    })
  } catch (err) {
    console.error('Analytics one-click error:', err)
    res.status(500).json({ error: 'Failed to generate analytics' })
  }
})

// GET /api/analytics/custom?from=YYYY-MM-DD&to=YYYY-MM-DD&type=job
router.get('/custom', authenticateToken, requireJobPoster, async (req, res) => {
  try {
    const { from, to } = req.query
    if (!from || !to) return res.status(400).json({ error: 'from and to dates are required' })
    
    const fromDT = new Date(from)
    const toDT = new Date(to)
    toDT.setHours(23,59,59,999)
    const userId = req.user.id
    const fromSQL = formatDateForSQL(fromDT)
    const toSQL = formatDateForSQL(toDT)

    // Total jobs in period
    const [jobsCountRows] = await db.query(
      'SELECT COUNT(*) as count FROM jobs WHERE user_id = ? AND created_at BETWEEN ? AND ?',
      [userId, fromSQL, toSQL]
    )

    // Total applications in period
    const [appsCountRows] = await db.query(
      `SELECT COUNT(a.id) as count FROM applications a
         JOIN jobs j ON a.job_id = j.id
         WHERE j.user_id = ? AND a.created_at BETWEEN ? AND ?`,
      [userId, fromSQL, toSQL]
    )

    // Applications by job (default: aggregate by job)
    const [rows] = await db.query(
      `SELECT j.id as job_id, j.job_title as job_title, j.company_name,
              COUNT(a.id) as applicationCount, j.created_at as jobCreatedAt
       FROM jobs j
       LEFT JOIN applications a ON a.job_id = j.id AND a.created_at BETWEEN ? AND ?
       WHERE j.user_id = ? AND j.created_at BETWEEN ? AND ?
       GROUP BY j.id ORDER BY applicationCount DESC`,
      [fromSQL, toSQL, userId, fromSQL, toSQL]
    )

    res.json({ 
      startDate: from, 
      endDate: to, 
      totalJobs: jobsCountRows[0].count || 0,
      totalApplications: appsCountRows[0].count || 0,
      applicationsByJob: rows,
      generatedAt: new Date().toISOString()
    })
  } catch (err) {
    console.error('Analytics custom error:', err)
    res.status(500).json({ error: 'Failed to generate custom analytics' })
  }
})

// GET /api/analytics/overall - all data since account creation
router.get('/overall', authenticateToken, requireJobPoster, async (req, res) => {
  try {
    const userId = req.user.id

    // Total jobs since account creation
    const [jobsCountRows] = await db.query(
      'SELECT COUNT(*) as count FROM jobs WHERE user_id = ?',
      [userId]
    )

    // Total applications since account creation
    const [appsCountRows] = await db.query(
      `SELECT COUNT(a.id) as count FROM applications a
         JOIN jobs j ON a.job_id = j.id
         WHERE j.user_id = ?`,
      [userId]
    )

    // Applications by job (all time)
    const [rows] = await db.query(
      `SELECT j.id as job_id, j.job_title as job_title, j.company_name,
              COUNT(a.id) as applicationCount, j.created_at as jobCreatedAt
       FROM jobs j
       LEFT JOIN applications a ON a.job_id = j.id
       WHERE j.user_id = ?
       GROUP BY j.id ORDER BY applicationCount DESC`,
      [userId]
    )

    res.json({ 
      type: 'overall',
      totalJobs: jobsCountRows[0].count || 0,
      totalApplications: appsCountRows[0].count || 0,
      applicationsByJob: rows,
      generatedAt: new Date().toISOString()
    })
  } catch (err) {
    console.error('Analytics overall error:', err)
    res.status(500).json({ error: 'Failed to generate overall analytics' })
  }
})


router.get('/subscription', authenticateToken, requireJobPoster, async (req, res) => {
  try {
    const userId = req.user.id
    const [rows] = await db.query('SELECT id, frequency, emails, active, last_sent, created_at, updated_at FROM analytics_subscriptions WHERE user_id = ? LIMIT 1', [userId])
    if (rows.length === 0) return res.json({})
    return res.json(rows[0])
  } catch (err) {
    console.error('Subscription get error:', err)
    res.status(500).json({ error: 'Failed to fetch subscription' })
  }
})

// POST /api/analytics/subscription
router.post('/subscription', authenticateToken, requireJobPoster, async (req, res) => {
  try {
    const userId = req.user.id
    const { status, emails } = req.body
    if (!status || !['notSubscribed','weekly','monthly'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }
    const active = status === 'notSubscribed' ? 0 : 1
    const frequency = status === 'weekly' ? 'weekly' : 'monthly'
    const emailsJson = JSON.stringify(Array.isArray(emails) ? emails : [])

    // upsert: either insert or update
    const [existing] = await db.query('SELECT id FROM analytics_subscriptions WHERE user_id = ? LIMIT 1', [userId])
    if (existing.length === 0) {
      await db.query('INSERT INTO analytics_subscriptions (user_id, frequency, emails, active) VALUES (?, ?, ?, ?)', [userId, frequency, emailsJson, active])
    } else {
      await db.query('UPDATE analytics_subscriptions SET frequency = ?, emails = ?, active = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?', [frequency, emailsJson, active, userId])
    }

    res.json({ message: 'Subscription saved' })
  } catch (err) {
    console.error('Subscription save error:', err)
    res.status(500).json({ error: 'Failed to save subscription' })
  }
})

// GET /api/analytics/export?type=custom|overall&from=YYYY-MM-DD&to=YYYY-MM-DD&format=csv
router.get('/export', authenticateToken, requireJobPoster, async (req, res) => {
  try {
    const { type = 'custom', from, to, format = 'csv' } = req.query
    const userId = req.user.id

    let rows = []

    if (type === 'overall') {
      // All time data
      const [data] = await db.query(
        `SELECT j.id as job_id, j.job_title as job_title, j.company_name,
                COUNT(a.id) as applicationCount, j.created_at as jobCreatedAt
         FROM jobs j
         LEFT JOIN applications a ON a.job_id = j.id
         WHERE j.user_id = ?
         GROUP BY j.id ORDER BY applicationCount DESC`,
        [userId]
      )
      rows = data
    } else if (type === 'custom' && from && to) {
      // Custom date range
      const fromSQL = formatDateForSQL(new Date(from))
      const toSQL = formatDateForSQL(new Date(to))
      const [data] = await db.query(
        `SELECT j.id as job_id, j.job_title as job_title, j.company_name,
                COUNT(a.id) as applicationCount, j.created_at as jobCreatedAt
         FROM jobs j
         LEFT JOIN applications a ON a.job_id = j.id AND a.created_at BETWEEN ? AND ?
         WHERE j.user_id = ? AND j.created_at BETWEEN ? AND ?
         GROUP BY j.id ORDER BY applicationCount DESC`,
        [fromSQL, toSQL, userId, fromSQL, toSQL]
      )
      rows = data
    } else {
      return res.status(400).json({ error: 'Invalid export type or missing dates' })
    }

    if (format === 'csv') {
      const header = ['job_id','job_title','company_name','applicationCount','jobCreatedAt']
      const lines = [header.join(',')]
      rows.forEach(r => {
        const jobTitle = (r.job_title || '').replace(/"/g,'""')
        const companyName = (r.company_name || '').replace(/"/g,'""')
        lines.push([r.job_id, `"${jobTitle}"`, `"${companyName}"`, r.applicationCount, r.jobCreatedAt].join(','))
      })
      const csv = lines.join('\n')
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="analytics_report_${Date.now()}.csv"`)
      return res.send(csv)
    }

    res.status(400).json({ error: 'Unsupported format' })
  } catch (err) {
    console.error('Analytics export error:', err)
    res.status(500).json({ error: 'Failed to export analytics' })
  }
})

export default router
