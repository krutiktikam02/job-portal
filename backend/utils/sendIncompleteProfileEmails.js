import { config } from 'dotenv';
import db from "../config/database.js";
import { google } from 'googleapis';

config(); // Load .env

// OAuth2 client setup
const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);
oAuth2Client.setCredentials({ refresh_token: process.env.OAUTH_REFRESH_TOKEN });

// Gmail API setup
const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

// Function to calculate profile completion percentage
function calculateProfileCompletion(user) {
  const sections = {
    hasProfile: user.profile_count > 0,
    firstName: !!user.first_name,
    lastName: !!user.last_name,
    email: !!user.email,
    phone: !!user.mobile_number,
    city: !!user.city,
    state: !!user.state,
    country: !!user.country,
    preferredLocation: !!user.preferred_location,
    age: !!user.age,
    gender: !!user.gender,
    jobType: !!user.job_type,
    expectedSalary: !!user.expected_salary,
    profileSummary: !!user.profile_summary,
    resume: !!user.resume_url,
    education: user.education_count > 0,
    skills: user.skills_count > 0,
    languages: user.languages_count > 0,
    internships: user.internships_count > 0,
    projects: user.projects_count > 0,
    employment: user.employment_count > 0,
    accomplishments: user.accomplishments_count > 0,
  };
  const values = Object.values(sections);
  const completed = values.filter(Boolean).length;
  return Math.round((completed / values.length) * 100);
}

// Function to fetch users with incomplete profiles
async function getUsersWithIncompleteProfiles() {
  try {
    const query = `
      SELECT 
        u.id AS user_id,
        u.email,
        u.full_name,
        u.mobile_number,
        u.work_status,
        u.user_type,
        -- Profile fields (from user_profiles)
        p.id AS profile_id,
        p.first_name,
        p.last_name,
        p.phone,
        p.city,
        p.state,
        p.country,
        p.preferred_location,
        p.age,
        p.gender,
        p.job_type,
        p.expected_salary,
        p.profile_summary,
        p.resume_url,
        -- Counts
        (SELECT COUNT(*) FROM user_profiles WHERE user_id = u.id) AS profile_count,
        (SELECT COUNT(*) FROM user_education WHERE user_id = u.id) AS education_count,
        (SELECT COUNT(*) FROM user_skills WHERE user_id = u.id) AS skills_count,
        (SELECT COUNT(*) FROM user_languages WHERE user_id = u.id) AS languages_count,
        (SELECT COUNT(*) FROM user_internships WHERE user_id = u.id) AS internships_count,
        (SELECT COUNT(*) FROM user_projects WHERE user_id = u.id) AS projects_count,
        (SELECT COUNT(*) FROM user_employment WHERE user_id = u.id) AS employment_count,
        (
          (SELECT COUNT(*) FROM user_accomplishments_awards WHERE user_profile_id = p.id) +
          (SELECT COUNT(*) FROM user_accomplishments_certifications WHERE user_profile_id = p.id) +
          (SELECT COUNT(*) FROM user_accomplishments_clubs_committees WHERE user_profile_id = p.id)
        ) AS accomplishments_count
      FROM users u
      LEFT JOIN user_profiles p ON p.user_id = u.id
      WHERE u.user_type = 'job_seeker'
    `;

    const [results] = await db.execute(query);
    // Filter users with less than 100% profile completion
    return results.filter((user) => calculateProfileCompletion(user) < 100);
  } catch (error) {
    console.error("Error fetching users with incomplete profiles:", error);
    throw error;
  }
}

// Function to send emails to users with incomplete profiles using Gmail API
async function sendIncompleteProfileEmails() {
  try {
    const users = await getUsersWithIncompleteProfiles();

    if (users.length === 0) {
      console.log("No users with incomplete profiles found.");
      return;
    }

    for (const user of users) {
      // Compose email
      const subject = "Complete Your Profile on Talent Corner Job Portal";
      const htmlBody = `Hi ${user.first_name || user.full_name},<br><br>
We noticed that your profile is not yet complete on the Talent Corner Job Portal. Completing your profile increases your chances of being discovered by recruiters.<br><br>
Don't miss out on great opportunities! Log in now and complete your profile.<br><br>
Best regards,<br>Talent Corner Team`;

      // Build raw email (base64url encoded MIME)
      const emailLines = [
        `From: \"Talent Corner JobPortal\" <${process.env.EMAIL_HOST}>`,
        `To: ${user.email}`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=utf-8`,
        `Content-Transfer-Encoding: 7bit`,
        '',
        htmlBody,
      ].join('\r\n');
      const rawEmail = Buffer.from(emailLines).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

      try {
        const { token: accessToken } = await oAuth2Client.getAccessToken();
        const res = await gmail.users.messages.send({
          userId: 'me',
          requestBody: { raw: rawEmail },
        });
        console.log(`✅ Email sent to ${user.email}: ${res.data.id}`);
      } catch (emailError) {
        console.error(`Failed to send email to ${user.email}:`, emailError.message);
      }
    }
  } catch (error) {
    console.error("Error sending emails to users with incomplete profiles:", error);
  }
}

export default sendIncompleteProfileEmails;