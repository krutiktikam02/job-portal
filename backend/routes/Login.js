import express from "express"
import db from "../config/database.js" // Import the database connection
import bcrypt from "bcryptjs" // For password hashing comparison
import jwt from "jsonwebtoken" // For generating JWT tokens (assuming jwt is installed)

const router = express.Router()

// Login route and controller
router.post("/", async (req, res) => {
  // Normalize input and defensively handle missing fields
  const { email: reqEmail, password: reqPassword, userType: reqUserType } = req.body || {}
  const email = String(reqEmail || "").trim()
  const password = String(reqPassword || "")
  const userType = String(reqUserType || "").toLowerCase()

  // Validation
  if (!email || !password) {
    return res.status(400).json({ errors: { general: "Email and password are required" } })
  }

  if (!userType || !["job_seeker", "job_poster"].includes(userType)) {
    return res.status(400).json({ errors: { general: "Invalid user type" } })
  }

  try {
    // Log database connection info for debugging
    console.log(`[Login] attempting query against DB host=${process.env.DB_HOST}, name=${process.env.DB_NAME}`)

    // First attempt: match both email and user_type exactly (as before)
    const [users] = await db.query("SELECT * FROM users WHERE email = ? AND user_type = ?", [email, userType])

    if (!Array.isArray(users) || users.length === 0) {
      // Diagnostic: check whether a user exists with this email but different user_type.
      try {
        const [emailOnly] = await db.query("SELECT * FROM users WHERE email = ?", [email])
        if (Array.isArray(emailOnly) && emailOnly.length > 0) {
          console.warn(
            `[Login] user found by email but user_type mismatch. email=${email} requestedType=${userType} dbType=${emailOnly[0].user_type}`,
          )
        } else {
          console.warn(`[Login] no user found for email=${email} (checked both with and without user_type filter)`)
        }
      } catch (qErr) {
        console.error("[Login] diagnostic query error:", qErr)
      }

      // Keep response identical for clients: do not reveal which side failed.
      return res.status(401).json({ error: "Invalid email or password" })
    }

    const user = users[0]
    console.log(`[Login] user record found: id=${user.id}, email=${user.email}, user_type=${user.user_type}`)

    // Defensive: ensure password field exists before comparing
    if (!user.password) {
      console.error(`[Login] user record missing password hash for id=${user.id} email=${email}`)
      return res.status(401).json({ error: "Invalid email or password" })
    }

    // Verify password
    let isMatch = false
    try {
      console.log(`[Login] comparing password. stored hash length=${user.password.length}, password length=${password.length}`)
      isMatch = await bcrypt.compare(password, user.password)
      console.log(`[Login] bcrypt.compare result: ${isMatch}`)
    } catch (bcryptErr) {
      console.error("[Login] bcrypt.compare error:", bcryptErr)
      return res.status(500).json({ error: "Internal server error" })
    }

    if (!isMatch) {
      console.warn(`[Login] password mismatch for email=${email}`)
      return res.status(401).json({ error: "Invalid email or password" })
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, userType: user.user_type },
      process.env.JWT_SECRET || "your-secret-key", // Use env variable for security
      { expiresIn: "1h" },
    )

    // Return success response with token
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        mobileNumber: user.mobile_number,
        workStatus: user.work_status,
        userType: user.user_type,
        companyName: user.company_name, // Added company_name for job posters
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    })
  }
})

export default router
