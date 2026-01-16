import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { downloadFileFromGCS } from './config/gcsStorage.js'
import multer from "multer";
import cron from "node-cron";
import sendIncompleteProfileEmails from "./utils/sendIncompleteProfileEmails.js";

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure Uploads directory exists in backend folder
const uploadsDir = path.join(__dirname, 'Uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Dynamic Multer configuration for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    cb(null, Date.now() + "-" + sanitizedName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
    files: 1,
  },
});



// Import admin routes
import adminAuthRouter from './routes/AdminAuth.js';
import adminDashboardRouter from './routes/AdminDashboard.js';
import adminUsersRouter from './routes/AdminUsers.js';
import adminJobsRouter from './routes/AdminJobs.js';
import adminResumesRouter from './routes/AdminResumes.js';
import adminSendEmailRouter from './routes/AdminSendEmail.js';

// Import existing routes
import signupRoutes from './routes/Signup.js';
import loginRoutes from './routes/Login.js';
import postJobsRoutes from './routes/PostJobs.js';
import postingProfileRoutes from './routes/PostingProfile.js';
import applicationsRoutes from './routes/Applications.js';
import scheduleInterviewRoutes from './routes/ScheduleInterview.js';
import messagesRoutes from './routes/PosterMessage.js';

import searchCandidatesRoutes from './routes/SearchCandidates.js';
import savedCandidatesRouter from "./routes/savedCandidates.js";

import jobRecommendationsRoute from "./routes/jobRecommendations.js";

import emailScheduler from './routes/emailScheduler.js';

import userBasicProfileInfoRoutes from './routes/UserBasicProfileInfo.js';       
import userProfileSkillsRoutes from './routes/UserProfileSkills.js';            
import userProfileLanguagesRoutes from './routes/UserProfileLanguages.js';       
import userProfileAccomplishmentsRoutes from './routes/UserProfileAccomplishments.js'; 
import userProfileInternshipsRoutes from './routes/UserProfileInternships.js';   
import userProfileProjectsRoutes from './routes/UserProfileProjects.js';        
import userProfileEducationsRoutes from './routes/UserProfileEducations.js';    
import userProfileEmploymentsRoutes from './routes/UserProfileEmployments.js';   
import analyticsRoutes from './routes/Analytics.js';
import settingsRoutes from './routes/Settings.js';

dotenv.config();

const app = express();

console.log("Loading routes:", { signupRoutes, loginRoutes, postJobsRoutes, postingProfileRoutes });

// Make upload available globally for routes
app.set('upload', upload);

// Allow both deployed and local frontend origins
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174', // Admin panel
    "https://jobportal-talentcor.vercel.app",
    "https://jobportal-admin-talentcor.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log(`CORS blocked origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

// Parse incoming JSON with increased limit for file uploads
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

// Serve static files from Uploads directory (matches /Uploads/applications/... paths)
app.use('/Uploads', express.static(uploadsDir));

// Fallback handler: if file not found in /Uploads, try direct filename fallback
// This handles older URLs that may have been saved without the /Uploads prefix
app.get('/Uploads/:filename', (req, res, next) => {
  const { filename } = req.params;
  // Prevent directory traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return res.status(400).json({ error: 'Invalid filename.' });
  }
  const filePath = path.join(uploadsDir, filename);
  
  // Check if file exists
  if (fs.existsSync(filePath)) {
    console.log('[Download] Found file at:', filePath);
    const stats = fs.statSync(filePath);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', (err) => {
      console.error('Error streaming file:', filePath, err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Could not stream the file.' });
      }
    });
    fileStream.pipe(res);
  } else {
    console.error('[Download] File not found at:', filePath);
    res.status(404).json({ error: 'File not found.' });
  }
});

// Handle downloads from GCS URLs (authenticated proxy)
app.get('/download', async (req, res) => {
  try {
    const gcsUrl = req.query.url;
    if (!gcsUrl || !gcsUrl.includes('storage.googleapis.com')) {
      console.log('[Download] Invalid or missing GCS URL:', gcsUrl);
      return res.status(400).json({ error: 'Invalid GCS URL' });
    }

    console.log('[Download] Processing authenticated GCS download for:', gcsUrl);

    // Extract bucket and file name from URL
    // URL format: https://storage.googleapis.com/bucket-name/file-path
    const urlParts = gcsUrl.replace('https://storage.googleapis.com/', '').split('/');
    const bucketName = urlParts[0];
    const fileName = urlParts.slice(1).join('/');

    console.log('[Download] Bucket:', bucketName, 'File:', fileName);

    // Download with authentication using service account
    const fileBuffer = await downloadFileFromGCS(bucketName, fileName);

    console.log('[Download] Successfully downloaded', fileBuffer.length, 'bytes');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', fileBuffer.length);
    res.setHeader('Content-Disposition', `inline; filename="resume.pdf"`);
    res.send(fileBuffer);
  } catch (err) {
    console.error('[Download] Error:', err.message);
    res.status(500).json({ error: 'Download failed: ' + err.message });
  }
});

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log(`Headers:`, req.headers);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`Body:`, JSON.stringify(req.body, null, 2));
  }
  next();
});

// Health check route (placed early to ensure matching)
app.get('/api/health', (req, res) => {
  console.log('Health check hit successfully');
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes - Order matters!

// Admin routes
app.use('/api/admin/auth', adminAuthRouter);
app.use('/api/admin/dashboard', adminDashboardRouter);
app.use('/api/admin/users', adminUsersRouter);
app.use('/api/admin/jobs', adminJobsRouter);
app.use('/api/admin/resumes', adminResumesRouter);
app.use('/api/admin', adminSendEmailRouter);

// User routes
app.use('/api/signup', signupRoutes);
app.use('/api/login', loginRoutes);

app.use('/api/postingprofile', postingProfileRoutes);

app.use('/api/jobs', postJobsRoutes);

app.use('/api/applications', applicationsRoutes);
// GET /api/applications/:jobId
// GET /api/applications/user/:userId

app.use('/api/scheduled-interviews', scheduleInterviewRoutes);

app.use('/api/messages', messagesRoutes);

app.use('/api/search/candidates', searchCandidatesRoutes);
app.use("/api/saved-candidates", savedCandidatesRouter);

app.use("/api/recommendations", jobRecommendationsRoute);

app.use('/api/email', emailScheduler);

// Analytics and Settings routes
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);

app.use('/api/userprofile', userBasicProfileInfoRoutes); 

app.use('/api/usereducations', userProfileEducationsRoutes); //   - DELETE /api/usereducations/:id

app.use('/api/userprojects', userProfileProjectsRoutes);
//   - DELETE /api/userprojects/:id
//   - POST /api/userprojects/:id/technologies
//   - DELETE /api/userprojects/:id/technologies/:technologyName

app.use('/api/userinternships', userProfileInternshipsRoutes); //   - DELETE /api/userinternships/:id

app.use('/api/useremployments', userProfileEmploymentsRoutes);
//   - DELETE /api/useremployments/:id
//   - POST /api/useremployments/:id/skills
//   - DELETE /api/useremployments/:id/skills/:skillName

app.use('/api/userskills', userProfileSkillsRoutes); //   - DELETE /api/userskills/:skillName
app.use('/api/userlanguages', userProfileLanguagesRoutes); //   - DELETE /api/userlanguages/:languageName
app.use('/api/useraccomplishments', userProfileAccomplishmentsRoutes);
//   - GET /api/useraccomplishments
//   - POST /api/useraccomplishments/certifications
//   - POST /api/useraccomplishments/awards
//   - POST /api/useraccomplishments/clubs
//   - DELETE /api/useraccomplishments/certifications/:id
//   - DELETE /api/useraccomplishments/awards/:id
//   - DELETE /api/useraccomplishments/clubs/:id


// Debug route to list all registered routes
app.get("/api/debug/routes", (req, res) => {
  const routes = [];

  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods),
      });
    } else if (middleware.name === "router") {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push({
            path: handler.route.path,
            methods: Object.keys(handler.route.methods),
          });
        }
      });
    }
  });

  res.json({ routes });
});

// Debug endpoint: list files under Uploads (only available outside production)
app.get('/api/debug/uploads', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not allowed in production' });
  }

  const walk = (dir) => {
    const results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
      const full = path.join(dir, file);
      const stat = fs.statSync(full);
      if (stat && stat.isDirectory()) {
        // Recursively collect entries from subdirectories and append them
        walk(full).forEach((entry) => results.push(entry));
      } else {
        results.push({ path: path.relative(uploadsDir, full), size: stat.size, mtime: stat.mtime });
      }
    });
    return results;
  };

  try {
    const files = walk(uploadsDir);
    return res.json({ uploadsDir, files });
  } catch (err) {
    console.error('Failed to list uploads:', err);
    return res.status(500).json({ error: 'Failed to list uploads' });
  }
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("🔥 Global error handler:", error);
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? error.message : "Something went wrong",
  });
});

// Schedule the script to run every 15 days at 10 AM
cron.schedule("0 10 */15 * *", () => {
  console.log("Running scheduled task: Sending emails to users with incomplete profiles (every 15 days)");
  sendIncompleteProfileEmails();
});

// Manual trigger for testing email functionality
// sendIncompleteProfileEmails();

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  // console.log(`📝 Business Entity Form API: http://localhost:${PORT}/api/business-entities`);
  console.log(`🔍 Debug routes: http://localhost:${PORT}/api/debug/routes`);
  console.log(`📋 All routes loaded successfully`); // Added for startup confirmation
});

export default app;