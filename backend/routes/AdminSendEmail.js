import express from 'express';
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Daily email tracking storage
const DAILY_EMAIL_LIMIT = 300;
const EMAIL_INTERVAL_MS = 72000; // 1.2 minutes (72 seconds) between emails

// In-memory storage (simple approach)
let dailyEmailCount = { date: new Date().toDateString(), count: 0 };
let emailProgressStore = new Map();

// Helper functions for daily count
function getDailyCount() {
  const today = new Date().toDateString();
  if (dailyEmailCount.date !== today) {
    dailyEmailCount = { date: today, count: 0 };
  }
  return dailyEmailCount.count;
}

function incrementDailyCount() {
  const today = new Date().toDateString();
  if (dailyEmailCount.date !== today) {
    dailyEmailCount = { date: today, count: 0 };
  }
  dailyEmailCount.count++;
  return dailyEmailCount.count;
}

// Encode non-ASCII header values per RFC 2047 (e.g., Subject with en-dash)
function encodeHeaderRFC2047(text) {
  try {
    if (typeof text !== 'string') return '';
    return /[^\x00-\x7F]/.test(text)
      ? `=?UTF-8?B?${Buffer.from(text, 'utf8').toString('base64')}?=`
      : text;
  } catch {
    return text || '';
  }
}

// Email accounts configuration
const emailAccounts = [
  {
    id: 'account1',
    name: 'Primary Account',
    email: process.env.EMAIL_HOST,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: process.env.REDIRECT_URI,
    refreshToken: process.env.OAUTH_REFRESH_TOKEN
  },
  {
    id: 'account2',
    name: 'Secondary Account',
    email: process.env.EMAIL_HOST_2,
    clientId: process.env.CLIENT_ID_2,
    clientSecret: process.env.CLIENT_SECRET_2,
    redirectUri: process.env.REDIRECT_URI_2,
    refreshToken: process.env.OAUTH_REFRESH_TOKEN_2
  },
  {
    id: 'account3',
    name: 'Tertiary Account',
    email: process.env.EMAIL_HOST_3,
    clientId: process.env.CLIENT_ID_3,
    clientSecret: process.env.CLIENT_SECRET_3,
    redirectUri: process.env.REDIRECT_URI_3,
    refreshToken: process.env.OAUTH_REFRESH_TOKEN_3
  },
  {
    id: 'account4',
    name: 'Fourth Account',
    email: process.env.EMAIL_HOST_4,
    clientId: process.env.CLIENT_ID_4,
    clientSecret: process.env.CLIENT_SECRET_4,
    redirectUri: process.env.REDIRECT_URI_4,
    refreshToken: process.env.OAUTH_REFRESH_TOKEN_4
  }
].filter(account => account.email && account.clientId && account.refreshToken);

// Debug log
console.log('📧 Email accounts configured:', emailAccounts.length);
console.log('Account 1 values:', {
  email: process.env.EMAIL_HOST,
  hasClientId: !!process.env.CLIENT_ID,
  hasClientSecret: !!process.env.CLIENT_SECRET,
  hasRefreshToken: !!process.env.OAUTH_REFRESH_TOKEN,
  refreshTokenStart: process.env.OAUTH_REFRESH_TOKEN?.substring(0, 10)
});

// Function to get Gmail client for a specific account
const getGmailClient = (accountId) => {
  const account = emailAccounts.find(acc => acc.id === accountId);
  if (!account) {
    throw new Error(`Email account ${accountId} not found or not configured`);
  }

  const oAuth2Client = new google.auth.OAuth2(
    account.clientId,
    account.clientSecret,
    account.redirectUri
  );
  oAuth2Client.setCredentials({ refresh_token: account.refreshToken });

  return {
    gmail: google.gmail({ version: 'v1', auth: oAuth2Client }),
    oAuth2Client,
    account
  };
};

// Get list of available email accounts
router.get('/email-accounts', (req, res) => {
  const accounts = emailAccounts.map(acc => ({
    id: acc.id,
    name: acc.name,
    email: acc.email
  }));
  res.json({ accounts });
});

// Get daily email count and limits
router.get('/daily-email-count', (req, res) => {
  const dailyCount = getDailyCount();
  const remaining = Math.max(0, DAILY_EMAIL_LIMIT - dailyCount);
  
  res.json({
    dailyCount,
    dailyLimit: DAILY_EMAIL_LIMIT,
    remaining,
    canSendMore: remaining > 0
  });
});

// Get email sending progress
router.get('/email-progress/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const progress = emailProgressStore.get(sessionId);
  
  if (!progress) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json(progress);
});

// Cancel email sending session
router.post('/cancel-email/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const progress = emailProgressStore.get(sessionId);
  
  if (!progress) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  progress.cancelled = true;
  progress.status = 'cancelled';
  emailProgressStore.set(sessionId, progress);
  
  res.json({ success: true, message: 'Email sending cancelled' });
});

// Middleware to verify admin token
const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // Simple token verification (you may want to use JWT verification here)
  // For now, just check if token exists in localStorage on frontend
  next();
};

// Send promotional email with rate limiting and progress tracking
router.post('/send-email', verifyAdmin, async (req, res) => {
  try {
    const { recipients, subject, message, emailAccountId = 'account1' } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'Recipients array is required' });
    }

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    // Check daily limit
    const dailyCount = getDailyCount();
    if (dailyCount >= DAILY_EMAIL_LIMIT) {
      return res.status(429).json({ 
        error: 'Daily email limit reached',
        dailyCount,
        dailyLimit: DAILY_EMAIL_LIMIT,
        message: 'You have reached the daily limit of 300 emails. Please try again tomorrow.'
      });
    }

    // Limit recipients to first 50 if more than 50
    const limitedRecipients = recipients.slice(0, 50);
    if (recipients.length > 50) {
      console.log(`📧 Limiting recipients from ${recipients.length} to 50`);
    }

    // Check if remaining daily limit can accommodate the request
    const remainingDaily = DAILY_EMAIL_LIMIT - dailyCount;
    const finalRecipients = limitedRecipients.slice(0, remainingDaily);
    
    if (finalRecipients.length < limitedRecipients.length) {
      console.log(`📧 Further limiting recipients to ${finalRecipients.length} due to daily limit`);
    }

    // Get Gmail client for selected account
    let gmailClient, oAuth2Client, account;
    try {
      const clients = getGmailClient(emailAccountId);
      gmailClient = clients.gmail;
      oAuth2Client = clients.oAuth2Client;
      account = clients.account;
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    // Preflight check: ensure Gmail API is reachable with current credentials
    try {
      await gmailClient.users.getProfile({ userId: 'me' });
    } catch (preflightErr) {
      console.error('❌ Gmail preflight failed:', preflightErr?.message || preflightErr);
      return res.status(503).json({
        error: 'Unable to send emails right now',
        details: preflightErr?.message || 'Gmail API not available',
        suggestion: 'Please try switching the sending account or try again later.'
      });
    }

    // Create session ID for progress tracking
    const sessionId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize progress tracking
    const progressData = {
      sessionId,
      totalEmails: finalRecipients.length,
      sentCount: 0,
      failedCount: 0,
      currentEmail: 0,
      status: 'sending',
      startTime: new Date().toISOString(),
      estimatedEndTime: new Date(Date.now() + finalRecipients.length * EMAIL_INTERVAL_MS).toISOString(),
      cancelled: false,
      errors: []
    };
    
    emailProgressStore.set(sessionId, progressData);

    console.log(`📧 Admin starting email send session ${sessionId} to ${finalRecipients.length} recipient(s) using ${account.email}`);

    // Return session info immediately and process emails in background
    res.json({
      success: true,
      sessionId,
      totalEmails: finalRecipients.length,
      limitedFrom: recipients.length,
      dailyLimit: DAILY_EMAIL_LIMIT,
      dailyCount: dailyCount,
      remainingDaily: remainingDaily,
      estimatedDuration: Math.ceil(finalRecipients.length * EMAIL_INTERVAL_MS / 60000), // in minutes
      message: `Email sending started. Session ID: ${sessionId}`
    });

    // Process emails in background with rate limiting
    setImmediate(async () => {
      try {
        for (let i = 0; i < finalRecipients.length; i++) {
          const recipient = finalRecipients[i];
          const progress = emailProgressStore.get(sessionId);

          // Check if cancelled
          if (progress && progress.cancelled) {
            console.log(`📧 Email sending cancelled for session ${sessionId}`);
            break;
          }

          // Check daily limit again
          const currentDailyCount = getDailyCount();
          if (currentDailyCount >= DAILY_EMAIL_LIMIT) {
            if (progress) {
              progress.status = 'daily_limit_reached';
              progress.errors.push({ recipient, error: 'Daily limit reached' });
              progress.failedCount++;
              emailProgressStore.set(sessionId, progress);
            }
            console.log(`📧 Daily limit reached during sending for session ${sessionId}`);
            break;
          }

          try {
            // Update progress
            if (progress) {
              progress.currentEmail = i + 1;
              progress.currentRecipient = recipient;
              emailProgressStore.set(sessionId, progress);
            }

            // Build raw email with unsubscribe header
            const htmlBody = message.replace(/\n/g, '<br>');
            const emailLines = [
              `From: "Talent Corner JobPortal" <${account.email}>`,
              `To: ${recipient}`,
              `Subject: ${encodeHeaderRFC2047(subject)}`,
              `List-Unsubscribe: <mailto:unsubscribe@talentcorner.in?subject=unsub>`,
              `MIME-Version: 1.0`,
              `Content-Type: text/html; charset=utf-8`,
              `Content-Transfer-Encoding: 7bit`,
              '',
              htmlBody,
            ].join('\r\n');

            const rawEmail = Buffer.from(emailLines)
              .toString('base64')
              .replace(/\+/g, '-')
              .replace(/\//g, '_');

            // Get fresh access token
            await oAuth2Client.getAccessToken();

            // Send via Gmail API
            const result = await gmailClient.users.messages.send({
              userId: 'me',
              requestBody: { raw: rawEmail },
            });

            console.log(`✅ Email sent to ${recipient}: ${result.data.id}`);
            if (progress) {
              progress.sentCount++;
              incrementDailyCount();
            }

          } catch (emailError) {
            console.error(`❌ Failed to send email to ${recipient}:`, emailError?.message || String(emailError));
            if (progress) {
              progress.failedCount++;
              progress.errors.push({ recipient, error: emailError?.message || String(emailError) });

              // If the very first email fails and nothing has been sent yet,
              // mark the whole session as error and stop so UI can inform the user immediately.
              if (i === 0 && progress.sentCount === 0) {
                progress.status = 'error';
                emailProgressStore.set(sessionId, progress);
                console.error(`📧 Session ${sessionId} marked as error due to first-email failure.`);
                break;
              }
            }
          }

          // Update progress
          if (progress) {
            emailProgressStore.set(sessionId, progress);
          }

          // Rate limiting: wait before sending next email (except for the last one)
          if (i < finalRecipients.length - 1) {
            await new Promise(resolve => setTimeout(resolve, EMAIL_INTERVAL_MS));
          }
        }

        // Mark as completed
        const finalProgress = emailProgressStore.get(sessionId);
        if (finalProgress) {
          if (finalProgress.status !== 'error' && finalProgress.status !== 'daily_limit_reached' && !finalProgress.cancelled) {
            finalProgress.status = 'completed';
          } else if (finalProgress.cancelled) {
            finalProgress.status = 'cancelled';
          }
          finalProgress.endTime = new Date().toISOString();
          emailProgressStore.set(sessionId, finalProgress);
          console.log(`📧 Email sending session ${sessionId} completed. Sent: ${finalProgress.sentCount}, Failed: ${finalProgress.failedCount}`);
        }
      } catch (err) {
        console.error(`💥 Unhandled error in background sender for session ${sessionId}:`, err?.message || String(err));
        const finalProgress = emailProgressStore.get(sessionId);
        if (finalProgress) {
          finalProgress.status = 'error';
          finalProgress.errors = finalProgress.errors || [];
          finalProgress.errors.push({ error: err?.message || String(err) });
          finalProgress.endTime = new Date().toISOString();
          emailProgressStore.set(sessionId, finalProgress);
        }
        // Do not rethrow; keep server alive
      }
    });
    
  } catch (error) {
    console.error('❌ Error in send-email route:', error);
    res.status(500).json({ error: 'Failed to start email sending', details: error.message });
  }
});

export default router;
