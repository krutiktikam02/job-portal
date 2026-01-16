// routes/UserBasicProfileInfo.js
import express from "express"
import db from "../config/database.js"
import jwt from "jsonwebtoken"
import multer from "multer"
import path from "path"
import fs from "fs"
import { createRequire } from 'module'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'
import { uploadFileToGCS } from '../config/gcsStorage.js'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const requireCJS = createRequire(import.meta.url)
const pdfParse = requireCJS('pdf-parse')

// Try to load mammoth for .docx extraction (optional)
let mammoth = null
try {
  mammoth = requireCJS('mammoth')
} catch (e) {
  mammoth = null
}

const GCS_BUCKET = 'jobportal-resumes'
// Helper to find a pdftotext executable: check 'where', common locations, and bundled tools
const findPdftotext = () => {
  try {
    const where = spawnSync('where', ['pdftotext'], { encoding: 'utf8' })
    if (where.status === 0 && where.stdout) {
      const p = where.stdout.split(/\r?\n/).find(Boolean)
      if (p && p.trim()) return p.trim()
    }
  } catch (err) {
    // ignore
  }

  const candidates = [
    'C:\\Program Files\\poppler\\bin\\pdftotext.exe',
    'C:\\Program Files (x86)\\poppler\\bin\\pdftotext.exe',
    'C:\\ProgramData\\chocolatey\\lib\\poppler\\tools\\**\\pdftotext.exe',
    'C:\\ProgramData\\chocolatey\\bin\\pdftotext.exe',
    path.join(process.cwd(), 'backend', 'tools', 'poppler', 'bin', 'pdftotext.exe'),
    path.join(process.cwd(), 'tools', 'poppler', 'bin', 'pdftotext.exe'),
  ]

  for (const c of candidates) {
    try {
      // simple existence check (ignore globs)
      if (fs.existsSync(c.replace('**\\\\pdftotext.exe', ''))) {
        const full = c.includes('**') ? c.replace('**\\pdftotext.exe','pdftotext.exe') : c
        if (fs.existsSync(full)) return full
      }
      if (fs.existsSync(c)) return c
    } catch (e) {
      // continue
    }
  }
  return null
}

const router = express.Router()

// Auth middleware (unchanged behavior)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]
  if (!token) return res.status(401).json({ error: "Access token required" })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key")
    req.user = decoded
    next()
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token", details: error.message })
  }
}

// Ensure uploads dir exists (for temporary local storage during processing)
const UploadsDir = path.join(__dirname, "..", "Uploads")
fs.mkdirSync(UploadsDir, { recursive: true })

// Multer storage for temporary local files (will be uploaded to GCS)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `temp-user-${req.user?.id || "anon"}-${Date.now()}${ext}`)
  },
})
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })

// Helper function to extract text from PDF using the CommonJS pdf-parse via createRequire
const extractTextFromPDF = async (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`[extractTextFromPDF] File not found: ${filePath}`)
      return ''
    }

    const dataBuffer = fs.readFileSync(filePath)
    const PDFParseClass = pdfParse?.PDFParse || (pdfParse?.default && pdfParse.default.PDFParse)
    if (!PDFParseClass) {
      console.error('[extractTextFromPDF] PDFParse class not found on module', Object.keys(pdfParse || {}))
      return ''
    }

    try {
      const parser = new PDFParseClass({ data: dataBuffer })
      const data = await parser.getText()
      if (typeof parser.destroy === 'function') {
        try {
          await parser.destroy()
        } catch (e) {
          console.warn('[extractTextFromPDF] Warning during parser cleanup:', e.message)
        }
      }
      let text = (data && data.text) ? data.text : ''
      console.log(`[extractTextFromPDF] pdf-parse succeeded, extracted ${text.length} chars`)
      return text
    } catch (parseErr) {
      console.error('[extractTextFromPDF] pdf-parse error:', parseErr.message)
      // Continue to fallback
    }

    // Fallback: if pdf-parse returned empty or failed, try pdftotext CLI (poppler)
    try {
      console.log('[extractTextFromPDF] Attempting pdftotext CLI fallback')
      const pdftotextPath = findPdftotext() || 'pdftotext'
      console.log('[extractTextFromPDF] Using pdftotext binary at:', pdftotextPath)
      const child = spawnSync(pdftotextPath, ['-layout', filePath, '-'], { 
        encoding: 'utf8', 
        maxBuffer: 10 * 1024 * 1024,
        timeout: 30000 
      })
      if (child.status === 0 && child.stdout && child.stdout.trim().length > 0) {
        console.log('[extractTextFromPDF] pdftotext succeeded, extracted', child.stdout.length, 'chars')
        return child.stdout
      } else {
        console.warn('[extractTextFromPDF] pdftotext produced no output:', child.stderr || child.error || 'status=' + child.status)
      }
    } catch (cliErr) {
      console.warn('[extractTextFromPDF] pdftotext fallback error:', cliErr.message)
    }

    console.warn('[extractTextFromPDF] All extraction methods failed, returning empty text')
    return ''
  } catch (error) {
    console.error("[extractTextFromPDF] Unexpected error:", error.message)
    return ""
  }
}

// Upload endpoints return a URL like /Uploads/<filename>
router.post("/upload/photo", authenticateToken, upload.single("profilePhoto"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" })
  const url = `/Uploads/${req.file.filename}`
  try {
    await db.query("UPDATE user_profiles SET profile_photo_url = ? WHERE user_id = ?", [url, req.user.id])
  } catch (error) {
    console.error("Failed to update profile photo URL in DB:", error)
    // Continue to return URL even if DB update fails, as file is saved
  }
  return res.status(200).json({ url })
})

router.post("/upload/resume", authenticateToken, upload.single("resume"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" })
  
  const filePath = path.join(UploadsDir, req.file.filename)
  
  try {
    console.log(`[upload/resume] Starting upload for user=${req.user.id}, file=${req.file.filename}`)
    
    // Detect file type by extension
    const ext = path.extname(req.file.originalname || req.file.filename || '').toLowerCase() || '.bin'
    console.log(`[upload/resume] Detected file extension: ${ext}`)
    
    // Extract text from the file based on type
    let extractedText = ""
    try {
      if (ext === '.pdf') {
        extractedText = await extractTextFromPDF(filePath)
        console.log(`[upload/resume] PDF extraction succeeded, length=${(extractedText||"").length}`)
      } else if (ext === '.docx') {
        // Extract from DOCX using mammoth
        if (mammoth) {
          try {
            const result = await mammoth.extractRawText({ path: filePath })
            extractedText = (result && result.value) ? result.value : ''
            console.log(`[upload/resume] DOCX extraction succeeded, length=${extractedText.length}`)
          } catch (mErr) {
            console.error('[upload/resume] mammoth extraction failed:', mErr.message)
            extractedText = ''
          }
        } else {
          console.warn('[upload/resume] mammoth not available; skipping DOCX text extraction')
        }
      } else if (ext === '.doc') {
        // Try antiword CLI if available as a best-effort fallback for old .doc files
        try {
          const anti = spawnSync('antiword', [filePath], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, timeout: 20000 })
          if (anti.status === 0 && anti.stdout && anti.stdout.trim().length > 0) {
            extractedText = anti.stdout
            console.log('[upload/resume] antiword extraction succeeded, length=', extractedText.length)
          } else {
            console.warn('[upload/resume] antiword produced no output or failed:', anti.stderr || anti.error || ('status=' + anti.status))
          }
        } catch (e) {
          console.warn('[upload/resume] antiword fallback failed:', e.message)
        }
      } else {
        console.log('[upload/resume] Unknown extension, skipping text extraction for', ext)
      }
    } catch (extractErr) {
      console.error(`[upload/resume] Extraction failed:`, extractErr.message)
      extractedText = ''
    }
    
    // Upload to GCS with user-specific filename and preserve original extension
    const gcsFileName = `resumes/user-${req.user.id}-${Date.now()}${ext}`
    const contentType = req.file.mimetype || 'application/octet-stream'
    console.log(`[upload/resume] Uploading to GCS: ${gcsFileName} with contentType=${contentType}`)
    
    const fileBuffer = fs.readFileSync(filePath)
    const gcsResult = await uploadFileToGCS(GCS_BUCKET, gcsFileName, fileBuffer, contentType)
    console.log(`[upload/resume] GCS upload successful: ${gcsResult.url}`)
    
    // Save GCS URL and extracted text to database
    try {
      const [result] = await db.query(
        "UPDATE user_profiles SET resume_url = ?, resume_text = ?, updated_at = NOW() WHERE user_id = ?",
        [gcsResult.url, extractedText || null, req.user.id]
      )
      console.log(`[upload/resume] DB update affectedRows=${result?.affectedRows || 0} for user=${req.user.id}`)
      
      if (result.affectedRows === 0) {
        console.warn(`[upload/resume] No rows updated. Creating profile entry...`)
        // If profile doesn't exist, create it with minimal required fields
        await db.query(
          "INSERT INTO user_profiles (user_id, first_name, last_name, email, resume_url, resume_text, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW())",
          [req.user.id, '', '', '', gcsResult.url, extractedText || null]
        )
        console.log(`[upload/resume] Profile created with resume for user=${req.user.id}`)
      }
    } catch (dbErr) {
      console.error("[upload/resume] Database error:", dbErr.message, dbErr.sql)
      // Don't fail the upload if DB save fails
    }
    
    // Clean up temporary file
    try {
      fs.unlinkSync(filePath)
      console.log(`[upload/resume] Temp file cleaned up`)
    } catch (err) {
      console.warn("Failed to delete temporary file:", err.message)
    }
    
    return res.status(200).json({ 
      success: true,
      url: gcsResult.url, 
      resume_text_length: (extractedText||"").length,
      resume_url: gcsResult.url 
    })
  } catch (err) {
    console.error("[upload/resume] Fatal error:", err.message)
    console.error(err.stack)
    
    // Clean up on error
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    } catch (e) {}
    
    return res.status(500).json({ 
      error: 'Upload failed: ' + err.message,
      details: err.stack 
    })
  }
})

// Save resume URL and text without requiring full profile payload
router.post("/resume", authenticateToken, async (req, res) => {
  try {
    const { resumeUrl, resumeText } = req.body || {}
    console.log(`[resume/POST] Saving resume for user=${req.user.id}, urlLength=${resumeUrl?.length || 0}, textLength=${resumeText?.length || 0}`)
    
    // First check if profile exists
    const [profiles] = await db.query(
      `SELECT id FROM user_profiles WHERE user_id = ?`,
      [req.user.id]
    )
    
    if (profiles.length > 0) {
      // Profile exists, just update resume fields
      const [result] = await db.query(
        `UPDATE user_profiles SET resume_url = ?, resume_text = ?, updated_at = NOW() WHERE user_id = ?`,
        [resumeUrl || null, resumeText || null, req.user.id]
      )
      console.log(`[resume/POST] Profile updated, affectedRows=${result?.affectedRows || 0}`)
    } else {
      // Profile doesn't exist, insert with minimal required fields
      await db.query(
        `INSERT INTO user_profiles (user_id, first_name, last_name, email, resume_url, resume_text, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [req.user.id, '', '', '', resumeUrl || null, resumeText || null]
      )
      console.log(`[resume/POST] New profile created with resume for user=${req.user.id}`)
    }
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('[resume/POST] Failed to save resume:', error.message, error.sql)
    return res.status(500).json({ error: 'Internal server error', details: error.message })
  }
})

// Delete photo
router.delete("/delete/photo", authenticateToken, async (req, res) => {
  try {
    const [profiles] = await db.query("SELECT profile_photo_url FROM user_profiles WHERE user_id = ?", [req.user.id])
    if (profiles.length && profiles[0].profile_photo_url) {
      const fileName = path.basename(profiles[0].profile_photo_url)
      const filePath = path.join(UploadsDir, fileName)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    }
    await db.query("UPDATE user_profiles SET profile_photo_url = NULL WHERE user_id = ?", [req.user.id])
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error("Failed to delete profile photo:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
})

// Delete resume
router.delete("/delete/resume", authenticateToken, async (req, res) => {
  try {
    const [profiles] = await db.query("SELECT resume_url FROM user_profiles WHERE user_id = ?", [req.user.id])
    if (profiles.length && profiles[0].resume_url) {
      const fileName = path.basename(profiles[0].resume_url)
      const filePath = path.join(UploadsDir, fileName)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    }
    await db.query("UPDATE user_profiles SET resume_url = NULL, resume_text = NULL WHERE user_id = ?", [req.user.id])
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error("Failed to delete resume:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
})

// Prefill GET (returns a single row)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const [profiles] = await db.query("SELECT * FROM user_profiles WHERE user_id = ?", [req.user.id])
    if (profiles.length === 0) {
      const [user] = await db.query("SELECT email FROM users WHERE id = ?", [req.user.id])
      if (user.length === 0) throw new Error("User not found in users table")
       // Don't auto-create a profile with dummy data
       // Instead, return a blank/empty profile so frontend can show blank fields
       await db.query(
         "INSERT INTO user_profiles (user_id, email) VALUES (?, ?)",
         [req.user.id, user[0].email],
       )
      const [newProfile] = await db.query("SELECT * FROM user_profiles WHERE user_id = ?", [req.user.id])
      return res.status(200).json(newProfile[0])
    }
    return res.status(200).json(profiles[0])
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" })
  }
})

// Save/Update PUT (accepts camelCase keys from frontend)
router.put("/", authenticateToken, async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    city,
    state,
    country,
    age,
    expectedSalary,
    gender,
    jobType,
    preferredLocation,
    profileSummary,
    profilePhotoUrl,
    resumeUrl,
  } = req.body

  // Minimal validation (same required fields as you had)
  const required = [
    firstName,
    lastName,
    email,
    phone,
    city,
    state,
    country,
    age,
    expectedSalary,
    gender,
    jobType,
    preferredLocation,
  ]
  if (required.some((v) => !v || (typeof v === "string" && v.trim() === ""))) {
    return res.status(400).json({ error: "Missing required fields" })
  }

  try {
    await db.query(
      `INSERT INTO user_profiles (
        user_id, first_name, last_name, email, phone, city, state, country, age, expected_salary, gender, job_type, preferred_location, profile_summary, profile_photo_url, resume_url, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        first_name = VALUES(first_name),
        last_name = VALUES(last_name),
        email = VALUES(email),
        phone = VALUES(phone),
        city = VALUES(city),
        state = VALUES(state),
        country = VALUES(country),
        age = VALUES(age),
        expected_salary = VALUES(expected_salary),
        gender = VALUES(gender),
        job_type = VALUES(job_type),
        preferred_location = VALUES(preferred_location),
        profile_summary = VALUES(profile_summary),
        profile_photo_url = VALUES(profile_photo_url),
        resume_url = VALUES(resume_url),
        updated_at = NOW()`,
      [
        req.user.id,
        firstName,
        lastName,
        email,
        phone,
        city,
        state,
        country,
        age,
        expectedSalary,
        gender,
        jobType,
        preferredLocation,
        profileSummary || null,
        profilePhotoUrl || null,
        resumeUrl || null,
      ],
    )
    return res.status(200).json({ message: "Profile updated successfully" })
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" })
  }
})

export default router