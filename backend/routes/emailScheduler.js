// routes/emailScheduler.js  (ES MODULE VERSION)
import { config } from 'dotenv';
import express from 'express';
import cron from 'node-cron';
import { google } from 'googleapis';  // For Gmail API

config(); // Load .env

const router = express.Router();

// In-memory storage
let scheduledEmails = [];

// OAuth2 client setup (global)
const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);
oAuth2Client.setCredentials({ refresh_token: process.env.OAUTH_REFRESH_TOKEN });

// Gmail API setup
const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

// Validate cron
const isValidCron = (expr) => {
  try {
    return cron.validate(expr);
  } catch {
    return false;
  }
};

// Send email (shared) – Using Gmail API (raw message)
const sendEmail = async (data) => {
  try {
    // Get fresh access token
    const { token: accessToken } = await oAuth2Client.getAccessToken();
    console.log('🔍 Token refreshed OK');

    // Build raw email (base64url encoded MIME)
    const htmlBody = data.html || data.text.replace(/\n/g, '<br>');  // Fix: Replace \n with <br> for HTML line breaks
    const emailLines = [
      `From: "Talent Corner JobPortal" <${process.env.EMAIL_HOST}>`,
      `To: ${data.to}`,
      `Subject: ${data.subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=utf-8`,
      `Content-Transfer-Encoding: 7bit`,
      '',
      htmlBody,
    ].join('\r\n');
    const rawEmail = Buffer.from(emailLines).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

    // Send via Gmail API
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: rawEmail,
      },
    });

    console.log(`✅ Email sent to ${data.to}: ${res.data.id}`);
    return { success: true, messageId: res.data.id };
  } catch (error) {
    console.error('❌ Gmail API Send Error:', error.message);
    return { success: false, error: error.message };
  }
};

// === SEND NOW (Immediate) ===
router.post('/send-now', async (req, res) => {
  const { to, subject, text, html } = req.body;

  if (!to || !subject || (!text && !html)) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const result = await sendEmail({ to, subject, text, html });

  if (result.success) {
    res.json({ success: true, messageId: result.messageId });
  } else {
    res.status(500).json({ error: result.error });
  }
});

// === SCHEDULE EMAIL ===
router.post('/schedule-email', (req, res) => {
  const { to, subject, text, html, cronExpression } = req.body;

  if (!to || !subject || (!text && !html) || !cronExpression) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!isValidCron(cronExpression)) {
    return res.status(400).json({ error: 'Invalid cron expression' });
  }

  const id = Date.now().toString();
  const job = { id, to, subject, text, html, cronExpression };

  const task = cron.schedule(cronExpression, () => sendEmail(job), {
    scheduled: true,
    timezone: 'Asia/Kolkata',
  });

  job.task = task;
  scheduledEmails.push(job);

  res.status(201).json({
    success: true,
    scheduledId: id,
    nextRun: task.nextDates().format(),
  });
});

// GET: List scheduled
router.get('/scheduled-emails', (req, res) => {
  const list = scheduledEmails.map(j => ({
    id: j.id,
    to: j.to,
    subject: j.subject,
    cron: j.cronExpression,
    next: j.task?.nextDates()?.format() || 'N/A',
  }));
  res.json({ success: true, count: list.length, emails: list });
});

// DELETE: Cancel
router.delete('/unschedule-email/:id', (req, res) => {
  const idx = scheduledEmails.findIndex(j => j.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  scheduledEmails[idx].task.stop();
  scheduledEmails.splice(idx, 1);
  res.json({ success: true, message: 'Unscheduled' });
});

// Graceful shutdown
process.on('SIGINT', () => {
  scheduledEmails.forEach(j => j.task?.stop());
  process.exit();
});

export default router;