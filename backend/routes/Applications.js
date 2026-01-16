import express from "express";
import db from "../config/database.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import { createRequire } from 'module'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'
import { uploadFileToGCS } from '../config/gcsStorage.js'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const requireCJS = createRequire(import.meta.url)
const pdfParse = requireCJS('pdf-parse')

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

const router = express.Router();

// Middleware to verify JWT token for authenticated routes
const authenticateToken = (req, res, next) => {
  console.log("Authenticating token...");
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  console.log("Token received:", token ? "Present" : "Missing");
  if (!token) {
    console.log("No token provided");
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    console.log("Decoded token:", decoded);
    req.user = decoded;
    console.log("Token authenticated, user:", decoded.email);
    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

// Dynamic Multer configuration for file upload - temporary local storage before GCS upload
const getStorage = (jobId) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const tempDir = path.join(__dirname, '..', 'Uploads', 'temp');
      // Ensure the temp directory exists
      fs.mkdirSync(tempDir, { recursive: true });
      cb(null, tempDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });
};

const getUpload = (jobId) => {
  return multer({
    storage: getStorage(jobId),
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'application/pdf' || 
          file.mimetype === 'application/msword' || 
          file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        cb(null, true);
      } else {
        cb(new Error('Only PDF, DOC, and DOCX files are allowed'), false);
      }
    }
  });
};

// Helper function to extract text from PDF using CommonJS pdf-parse via createRequire
const extractTextFromPDF = async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const PDFParseClass = pdfParse?.PDFParse || (pdfParse?.default && pdfParse.default.PDFParse)
    if (!PDFParseClass) {
      console.error('PDF parse loader issue: PDFParse class not found on module', Object.keys(pdfParse || {}));
      return '';
    }
    const parser = new PDFParseClass({ data: dataBuffer });
    const data = await parser.getText();
    if (typeof parser.destroy === 'function') await parser.destroy();
    let text = (data && data.text) ? data.text : '';

    // Fallback: try pdftotext CLI if pdf-parse returned nothing
    if ((!text || text.trim().length === 0)) {
      try {
        console.log('pdf-parse returned empty; attempting pdftotext CLI fallback')
        const pdftotextPath = findPdftotext() || 'pdftotext'
        console.log('Using pdftotext binary at:', pdftotextPath)
        const child = spawnSync(pdftotextPath, ['-layout', filePath, '-'], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 })
        if (child.status === 0 && child.stdout && child.stdout.trim().length > 0) {
          text = child.stdout
          console.log('pdftotext fallback succeeded, length=', text.length)
        } else {
          console.warn('pdftotext fallback produced no output or failed:', child.stderr || child.error || child.status)
        }
      } catch (cliErr) {
        console.error('pdftotext fallback error:', cliErr);
      }
    }

    return text;
  } catch (error) {
    console.error("PDF text extraction error:", error);
    return "";
  }
};

// POST /api/applications - Create a new application
router.post('/', async (req, res) => {
  try {
    console.log("[applications] Received POST request");

    // Use multer to handle file upload
    const upload = multer({
      storage: multer.diskStorage({
        destination: (req, file, cb) => {
          const tempDir = path.join(__dirname, '..', 'Uploads', 'temp');
          fs.mkdirSync(tempDir, { recursive: true });
          cb(null, tempDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          cb(null, uniqueSuffix + path.extname(file.originalname));
        }
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf' || 
            file.mimetype === 'application/msword' || 
            file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          cb(null, true);
        } else {
          cb(new Error('Only PDF, DOC, and DOCX files are allowed'), false);
        }
      }
    }).single('cv');

    // Parse the request with multer
    upload(req, res, async (err) => {
      if (err && err.message === 'Unexpected field') {
        console.error('[applications] Multer field error:', err.message);
        return res.status(400).json({ error: 'Invalid form data - expected field name "cv"' });
      }
      if (err) {
        console.error('[applications] Multer error:', err.message);
        return res.status(400).json({ error: err.message });
      }

      // Extract form fields
      const { applicant_name, applicant_email, applicant_mobile, city, state, experience, job_id } = req.body;
      console.log('[applications] Form data:', { applicant_name, applicant_email, applicant_mobile, city, state, job_id });

      // Validate required fields
      const applicant_name_trim = (applicant_name || '').trim();
      const applicant_email_trim = (applicant_email || '').trim();
      const applicant_mobile_trim = (applicant_mobile || '').trim();
      const city_trim = (city || '').trim();
      const state_trim = (state || '').trim();
      const experience_trim = (experience || '').trim();

      if (!applicant_name_trim || !applicant_email_trim || !applicant_mobile_trim || !city_trim || !state_trim || !job_id) {
        console.error('[applications] Missing required fields');
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Get user_id from token if available
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.split(" ")[1];
      let user_id = null;
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
          user_id = decoded.id;
        } catch (error) {
          console.warn('[applications] Invalid token, proceeding as guest');
        }
      }

      // Check for duplicate application
      if (user_id) {
        const [existing] = await db.query(
          `SELECT 1 FROM applications WHERE user_id = ? AND job_id = ?`,
          [user_id, job_id]
        );
        if (existing.length > 0) {
          console.log('[applications] Duplicate application detected');
          if (req.file) fs.unlinkSync(req.file.path);
          return res.status(409).json({ error: 'You have already applied for this job' });
        }
      }

      // Process file if uploaded
      let cv_url = null;
      let cv_text = null;

      if (req.file) {
        try {
          const filePath = req.file.path;
          console.log('[applications] Processing file:', filePath);

          // Extract text from CV
          cv_text = await extractTextFromPDF(filePath);
          console.log(`[applications] PDF extraction succeeded, length=${(cv_text || "").length}`);

          // Upload to GCS
          const gcsFileName = `applications/job-${job_id}/app-${user_id || 'guest'}-${Date.now()}.pdf`;
          const fileBuffer = fs.readFileSync(filePath);
          const gcsResult = await uploadFileToGCS(GCS_BUCKET, gcsFileName, fileBuffer, 'application/pdf');
          cv_url = gcsResult.url;
          console.log(`[applications] GCS upload successful: ${cv_url}`);

          // Clean up temp file
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            console.warn('[applications] Failed to delete temp file:', e.message);
          }
        } catch (fileErr) {
          console.error('[applications] File processing error:', fileErr.message);
          cv_text = "";
          // Try to still upload even if extraction failed
          if (req.file && fs.existsSync(req.file.path)) {
            try {
              const fileBuffer = fs.readFileSync(req.file.path);
              const gcsFileName = `applications/job-${job_id}/app-${user_id || 'guest'}-${Date.now()}.pdf`;
              const gcsResult = await uploadFileToGCS(GCS_BUCKET, gcsFileName, fileBuffer, 'application/pdf');
              cv_url = gcsResult.url;
              console.log(`[applications] GCS upload successful (no text): ${cv_url}`);
              fs.unlinkSync(req.file.path);
            } catch (gcsErr) {
              console.error('[applications] GCS upload error:', gcsErr.message);
              if (req.file) fs.unlinkSync(req.file.path);
            }
          }
        }
      }

      // Insert into database
      try {
        const insertQuery = `
          INSERT INTO applications 
          (user_id, job_id, applicant_name, applicant_email, applicant_mobile, city, state, experience, cv_url, cv_text, status) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'applied')
        `;
        const values = [
          user_id, job_id, applicant_name_trim, applicant_email_trim,
          applicant_mobile_trim, city_trim, state_trim, experience_trim,
          cv_url, cv_text || null
        ];

        const [result] = await db.query(insertQuery, values);
        console.log('[applications] Application inserted, ID:', result.insertId);

        res.status(201).json({
          success: true,
          message: 'Application submitted successfully',
          id: result.insertId,
          cv_text_length: (cv_text || "").length
        });
      } catch (dbErr) {
        console.error('[applications] Database error:', dbErr.message, dbErr.sql);
        res.status(500).json({ error: 'Failed to save application: ' + dbErr.message });
      }
    });
  } catch (err) {
    console.error('[applications] Fatal error:', err.message);
    res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
});

// PATCH /api/applications/:id/status - Update application status (requires auth, job_poster)
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    console.log("Received PATCH /api/applications/:id/status request, id:", req.params.id);

    if (req.user.userType !== "job_poster") {
      return res.status(403).json({ error: "Only job posters can update application status" });
    }

    let { status } = req.body;
    if (typeof status === 'string') {
      status = status.trim();
    }

    if (!status || !['applied', 'under_review', 'interview', 'rejected', 'hired'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status provided' });
    }

    // Verify the application belongs to one of the user's jobs
    const [existingApps] = await db.query(`
      SELECT a.id, j.user_id 
      FROM applications a 
      JOIN jobs j ON a.job_id = j.id 
      WHERE a.id = ?
    `, [req.params.id]);

    if (existingApps.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (existingApps[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to update this application' });
    }

    console.log("Executing database status update query...");
    const [result] = await db.query(
      'UPDATE applications SET status = ? WHERE id = ?',
      [status, req.params.id]
    );

    console.log("Status updated, affected rows:", result.affectedRows);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Fetch the updated application to return it (including updated_at)
    const [updatedApp] = await db.query(
      `SELECT id, user_id, job_id, applicant_name, applicant_email, applicant_mobile, city, state, experience, cv_url, created_at, updated_at, status 
       FROM applications 
       WHERE id = ?`,
      [req.params.id]
    );

    res.json({ 
      success: true, 
      message: 'Status updated successfully',
      application: updatedApp[0]
    });
  } catch (error) {
    console.error('Error updating application status:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/applications/:id/status - Update application status (requires auth, job_poster)
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    console.log("Received PUT /api/applications/:id/status request, id:", req.params.id);

    if (req.user.userType !== "job_poster") {
      return res.status(403).json({ error: "Only job posters can update application status" });
    }

    let { status } = req.body;
    if (typeof status === 'string') {
      status = status.trim();
    }

    if (!status || !['applied', 'under_review', 'interview', 'rejected', 'hired'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status provided' });
    }

    // Verify the application belongs to one of the user's jobs
    const [existingApps] = await db.query(`
      SELECT a.id, j.user_id 
      FROM applications a 
      JOIN jobs j ON a.job_id = j.id 
      WHERE a.id = ?
    `, [req.params.id]);

    if (existingApps.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (existingApps[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to update this application' });
    }

    console.log("Executing database status update query...");
    const [result] = await db.query(
      'UPDATE applications SET status = ? WHERE id = ?',
      [status, req.params.id]
    );

    console.log("Status updated, affected rows:", result.affectedRows);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Fetch the updated application to return it (including updated_at)
    const [updatedApp] = await db.query(
      `SELECT id, user_id, job_id, applicant_name, applicant_email, applicant_mobile, city, state, experience, cv_url, created_at, updated_at, status 
       FROM applications 
       WHERE id = ?`,
      [req.params.id]
    );

    res.json({ 
      success: true, 
      message: 'Status updated successfully',
      application: updatedApp[0]
    });
  } catch (error) {
    console.error('Error updating application status:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/applications/:id - Update an existing application (requires auth)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    console.log("Received PUT /api/applications/:id request, id:", req.params.id);

    // First, fetch the existing application and job owner
    const [existingApps] = await db.query(
      `SELECT a.id, a.user_id, a.job_id, a.cv_url, j.user_id as job_owner_id 
       FROM applications a 
       JOIN jobs j ON a.job_id = j.id 
       WHERE a.id = ?`,
      [req.params.id]
    );
    if (existingApps.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    const app = existingApps[0];

    const isJobSeeker = req.user.userType === "job_seeker";
    const isJobPoster = req.user.userType === "job_poster";

    if (isJobSeeker) {
      if (app.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized to update this application' });
      }
    } else if (isJobPoster) {
      if (app.job_owner_id !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized to update this application' });
      }
    } else {
      return res.status(403).json({ error: 'Invalid user type' });
    }

    const tempUpload = multer({
      storage: multer.diskStorage({
        destination: (req, file, cb) => {
          const tempDir = path.join(__dirname, '..', 'Uploads', 'temp');
          fs.mkdirSync(tempDir, { recursive: true });
          cb(null, tempDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          cb(null, uniqueSuffix + path.extname(file.originalname));
        }
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (file.fieldname === 'cv' && (file.mimetype === 'application/pdf' || 
            file.mimetype === 'application/msword' || 
            file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
          cb(null, true);
        } else if (file.fieldname !== 'cv') {
          cb(null, true);
        } else {
          cb(new Error('Only PDF, DOC, and DOCX files are allowed'), false);
        }
      }
    }).single('cv');

    tempUpload(req, res, async (err) => {
      if (err) {
        console.error('Multer error:', err.message);
        return res.status(400).json({ error: err.message });
      }

      const { status, applicant_name, applicant_email, applicant_mobile, city, state, experience } = req.body;
      console.log("Request body:", req.body);

      if (isJobPoster && status && !applicant_name && !applicant_email && !applicant_mobile && !city && !state && !experience) {
        // Job poster updating status only
        let newStatus = status.trim();
        if (!['applied', 'under_review', 'interview', 'rejected', 'hired'].includes(newStatus)) {
          return res.status(400).json({ error: 'Invalid status provided' });
        }

        console.log("Executing database status update query...");
        const [result] = await db.query(
          'UPDATE applications SET status = ? WHERE id = ?',
          [newStatus, req.params.id]
        );
        console.log("Status updated, affected rows:", result.affectedRows);

        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Application not found' });
        }

        // Fetch the updated application to return it (including updated_at)
        const [updatedApp] = await db.query(
          `SELECT id, user_id, job_id, applicant_name, applicant_email, applicant_mobile, city, state, experience, cv_url, created_at, updated_at, status 
           FROM applications 
           WHERE id = ?`,
          [req.params.id]
        );

        res.json({ 
          success: true, 
          message: 'Status updated successfully',
          application: updatedApp[0]
        });
      } else {
        // Job seeker updating their application details
        // Trim and validate
        const applicant_name_trim = (applicant_name || '').trim();
        const applicant_email_trim = (applicant_email || '').trim();
        const applicant_mobile_trim = (applicant_mobile || '').trim();
        const city_trim = (city || '').trim();
        const state_trim = (state || '').trim();
        const experience_trim = (experience || '').trim();

        if (!applicant_name_trim || !applicant_email_trim || !applicant_mobile_trim || !city_trim || !state_trim) {
          console.log("Missing required fields");
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const jobId = app.job_id;

        // Handle new CV upload if provided
        let cv_url = app.cv_url;
        let cv_text = null;
        if (req.file) {
          const cvFile = req.file;
          if (cvFile) {
            try {
              const filePath = cvFile.path;
              console.log('[applications] Processing file for update:', filePath);

              // Extract text from CV
              cv_text = await extractTextFromPDF(filePath);
              console.log(`[applications] PDF extraction succeeded, length=${(cv_text || "").length}`);

              // Upload to GCS
              const gcsFileName = `applications/job-${jobId}/app-${app.user_id}-${Date.now()}.pdf`;
              const fileBuffer = fs.readFileSync(filePath);
              const gcsResult = await uploadFileToGCS(GCS_BUCKET, gcsFileName, fileBuffer, 'application/pdf');
              cv_url = gcsResult.url;
              console.log(`[applications] GCS upload successful: ${cv_url}`);

              // Clean up temp file
              try {
                fs.unlinkSync(filePath);
              } catch (e) {
                console.warn('[applications] Failed to delete temp file:', e.message);
              }
            } catch (fileErr) {
              console.error('[applications] File processing error:', fileErr.message);
              cv_text = "";
              // Try to still upload even if extraction failed
              if (cvFile && fs.existsSync(cvFile.path)) {
                try {
                  const fileBuffer = fs.readFileSync(cvFile.path);
                  const gcsFileName = `applications/job-${jobId}/app-${app.user_id}-${Date.now()}.pdf`;
                  const gcsResult = await uploadFileToGCS(GCS_BUCKET, gcsFileName, fileBuffer, 'application/pdf');
                  cv_url = gcsResult.url;
                  console.log(`[applications] GCS upload successful (no text): ${cv_url}`);
                  fs.unlinkSync(cvFile.path);
                } catch (gcsErr) {
                  console.error('[applications] GCS upload error:', gcsErr.message);
                  if (cvFile) fs.unlinkSync(cvFile.path);
                }
              }
            }
          }
        }

        console.log("Executing database update query...");
        const query = `
          UPDATE applications 
          SET applicant_name = ?, applicant_email = ?, applicant_mobile = ?, city = ?, state = ?, experience = ?, cv_url = ?, cv_text = ?
          WHERE id = ?
        `;
        const values = [applicant_name_trim, applicant_email_trim, applicant_mobile_trim, city_trim, state_trim, experience_trim, cv_url, cv_text, req.params.id];

        const [result] = await db.query(query, values);
        console.log("Application updated, affected rows:", result.affectedRows);

        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Application not found' });
        }

        // Fetch the updated application to return it (including updated_at)
        const [updatedApp] = await db.query(
          `SELECT id, user_id, job_id, applicant_name, applicant_email, applicant_mobile, city, state, experience, cv_url, created_at, updated_at, status 
           FROM applications 
           WHERE id = ?`,
          [req.params.id]
        );

        res.json({ 
          success: true, 
          message: 'Application updated successfully',
          application: updatedApp[0]
        });
      }
    });
  } catch (error) {
    console.error('Error updating application:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/applications/:id - Withdraw an application (requires auth)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    console.log("Received DELETE /api/applications/:id request, id:", req.params.id);

    // Verify user owns the application and get job_id for file path
    const [existingApps] = await db.query(
      'SELECT id, user_id, job_id, cv_url FROM applications WHERE id = ?',
      [req.params.id]
    );
    if (existingApps.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }
    if (existingApps[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized to delete this application' });
    }
    const jobId = existingApps[0].job_id;


    console.log("Executing database delete query...");
    const [result] = await db.query(
      'DELETE FROM applications WHERE id = ?',
      [req.params.id]
    );
    console.log("Application deleted, affected rows:", result.affectedRows);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({ 
      success: true, 
      message: 'Application withdrawn successfully' 
    });
  } catch (error) {
    console.error('Error deleting application:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/applications - Get all applications for the current user (requires auth, job_seeker)
router.get('/', authenticateToken, async (req, res) => {
  console.log("Received GET /api/applications request for current user");
  try {
    // Verify user type
    if (req.user.userType !== "job_seeker") {
      console.log("User is not a job_seeker");
      return res.status(403).json({ error: 'Only job seekers can view their applications' });
    }

    console.log("Executing database query for user:", req.user.id);
    const query = `
      SELECT a.id, a.job_id, a.applicant_name, a.applicant_email, a.applicant_mobile, a.city, a.state, a.experience, a.cv_url, a.created_at, a.updated_at, a.status,
             j.job_title, j.company_name, j.job_location
      FROM applications a 
      JOIN jobs j ON a.job_id = j.id 
      WHERE a.user_id = ? 
      ORDER BY a.updated_at DESC, a.created_at DESC
    `;
    const [rows] = await db.query(query, [req.user.id]);
    console.log("Fetched user applications:", rows.length);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching user applications:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/applications/:jobId - Get all applications for a specific job (requires auth, job_poster)
router.get('/:jobId', authenticateToken, async (req, res) => {
  console.log("Received GET /api/applications/:jobId request, jobId:", req.params.jobId);
  try {
    if (req.user.userType !== "job_poster") {
      return res.status(403).json({ error: "Only job posters can view applications" });
    }

    const { jobId } = req.params;

    console.log("Executing database query...");
    const query = `
      SELECT id, user_id, applicant_name, applicant_email, applicant_mobile, city, state, experience, cv_url, created_at, updated_at, status 
      FROM applications 
      WHERE job_id = ? 
      ORDER BY updated_at DESC, created_at DESC
    `;
    const [rows] = await db.query(query, [jobId]);
    console.log("Fetched applications:", rows.length);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching applications for job:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/applications/user/:userId - Get all applications for a specific user (requires auth, job_seeker) - Kept for backward compatibility
router.get('/user/:userId', authenticateToken, async (req, res) => {
  console.log("Received GET /api/applications/user/:userId request, userId:", req.params.userId);
  try {
    const { userId } = req.params;

    // Verify the userId matches the authenticated user
    if (req.user.id != userId || req.user.userType !== "job_seeker") {
      console.log("Unauthorized access attempt");
      return res.status(403).json({ error: 'Unauthorized to view applications for this user' });
    }

    console.log("Executing database query...");
    const query = `
      SELECT a.id, a.job_id, a.applicant_name, a.applicant_email, a.applicant_mobile, a.city, a.state, a.experience, a.cv_url, a.created_at, a.updated_at, a.status,
             j.job_title, j.company_name, j.job_location
      FROM applications a 
      JOIN jobs j ON a.job_id = j.id 
      WHERE a.user_id = ? 
      ORDER BY a.updated_at DESC, a.created_at DESC
    `;
    const [rows] = await db.query(query, [userId]);
    console.log("Fetched user applications:", rows.length);

    res.json(rows);
  } catch (error) {
    console.error('Error fetching user applications:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;