import express from "express"
import db from "../config/database.js" // Import the database connection
import bcrypt from "bcryptjs" // For password hashing (assuming bcryptjs is installed; use 'bcrypt' if preferred)
import validator from "validator" // For email validation (assuming validator is installed)

const router = express.Router()

// Validation function
const validateSignupData = (data) => {
  const errors = {}

  if (!data.fullName || !data.fullName.trim()) {
    errors.fullName = "Full name is required"
  }

  if (!data.email) {
    errors.email = "Email is required"
  } else if (!validator.isEmail(data.email)) {
    errors.email = "Please enter a valid email address"
  }

  if (!data.password) {
    errors.password = "Password is required"
  } else {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@!%*?&]{8,}$/
    if (!passwordRegex.test(data.password)) {
      errors.password = "Password must be at least 8 characters with uppercase, lowercase, and number"
    }
  }

  if (!data.mobileNumber) {
    errors.mobileNumber = "Mobile number is required"
  } else {
    const mobileRegex = /^(?:\+91)?[6-9]\d{9}$/
    if (!mobileRegex.test(data.mobileNumber.replace(/\s+/g, ""))) {
      errors.mobileNumber = "Please enter a valid 10-digit Indian mobile number (starting with 6-9)"
    }
  }

  if (!data.userType || !["job_seeker", "job_poster"].includes(data.userType)) {
    errors.userType = "Please select a valid user type"
  }

  if (data.userType === "job_seeker") {
    if (!data.workStatus || !["experienced", "fresher"].includes(data.workStatus)) {
      errors.workStatus = "Please select a valid work status (experienced or fresher)"
    }
  } else if (data.userType === "job_poster") {
    if (!data.companyName || !data.companyName.trim()) {
      errors.companyName = "Company name is required"
    }
  }

  // sendUpdates is boolean, no validation needed beyond type
  if (typeof data.sendUpdates !== "boolean") {
    data.sendUpdates = false // Default to false if invalid
  }

  return errors
}

// Signup route and controller
router.post("/", async (req, res) => {
  const { fullName, email, password, mobileNumber, workStatus, companyName, sendUpdates, userType } = req.body

  // Validate input data
  const errors = validateSignupData({
    fullName,
    email,
    password,
    mobileNumber,
    workStatus,
    companyName,
    sendUpdates,
    userType,
  })
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors })
  }

  try {
    // Hash the password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const [result] = await db.query(
      `INSERT INTO users (full_name, email, password, mobile_number, work_status, company_name, send_updates, user_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fullName,
        email,
        hashedPassword,
        mobileNumber,
        userType === "job_seeker" ? workStatus : null, // Only set work_status for job seekers
        userType === "job_poster" ? companyName : null, // Only set company_name for job posters
        sendUpdates ? 1 : 0,
        userType,
      ],
    )

    res.status(201).json({
      message: "User created successfully",
      userId: result.insertId,
    })
  } catch (error) {
    console.error("Signup error:", error)

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Email already exists" })
    }

    res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
    })
  }
})

export default router