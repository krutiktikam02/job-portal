# Secrets & Credentials — Security Playbook

This document explains what we changed and how to rotate and remove secrets that were inadvertently committed to this repository.

## What I changed now
- Replaced `backend/.env` contents with a redaction notice. A safe example file is available at `backend/.env.example`.
- Replaced `backend/gcs-key.json` with a redaction notice and added `backend/gcs-key.example.json`.
- Redacted `account credentials.txt` to remove plaintext credentials.
- Added `.gitignore` entries to prevent accidental commits of `.env`, `gcs-key.json`, and credential files.

## Immediate next steps (rotate exposed credentials)
1. **GCS service account key**
   - Revoke the existing key in GCP Console (IAM → Service Accounts → Keys) or delete via gcloud:
     ```bash
     gcloud iam service-accounts keys delete KEY_ID --iam-account=jobportal-backend@YOUR_PROJECT.iam.gserviceaccount.com
     ```
   - Create a new key only when needed and **download** it to `backend/gcs-key.json` locally (never commit).

2. **Google OAuth / Gmail client secrets**
   - Go to Google Cloud Console → Credentials → OAuth 2.0 Client IDs, and rotate client secret(s).
   - Update the new client IDs/secrets in your environment and configuration (e.g., CI/CD secrets, Vercel/GCP secret manager).

3. **Database password and other secrets**
   - Change DB password, update user credentials, and update your production environment variables.
   - Rotate any SMTP credentials or API keys that were exposed.

4. **JWT_SECRET**
   - Generate a new JWT secret (secure random) and update it in your production environment.
   - Consider implementing a token invalidation strategy if applicable.

## Removing secrets from Git history
If the secret files were committed previously, it's recommended to remove them from history (note: this rewrites history).

**Using BFG (recommended for simple cases):**
```bash
# Remove files from all commits
bfg --delete-files backend/gcs-key.json
bfg --delete-files "*backend/.env" 
bfg --delete-files "account credentials.txt"
# Follow BFG output instructions (git reflog expire, git gc)
git push --force
```

**Using git-filter-repo (recommended):**
```bash
# Install: pip install git-filter-repo
git filter-repo --invert-paths --path backend/gcs-key.json --path "backend/.env" --path "account credentials.txt"
# Force-push rewritten history
git push --force --all
```

After rewriting history, rotate any credentials that were exposed (see steps above), and notify team members to re-clone the repository.

## Best practices
- Never store secrets in plaintext in the repository.
- Use environment variables and secure storage (GitHub Secrets, Vercel/Netlify environment vars, GCP Secret Manager, or a vault) for production secrets.
- Add a pre-commit hook (e.g., `git-secrets` or `detect-secrets`) to prevent accidental commits of credentials.
- Limit service account permissions following the principle of least privilege.

## Helpful commands
- Remove a file from index (stop tracking):
```bash
git rm --cached backend/gcs-key.json
git commit -m "Remove sensitive file from repo"
git push
```

- Audit the repo for potential secrets (basic scan):
```bash
# Using the open-source detect-secrets
pip install detect-secrets
detect-secrets scan > .secrets.baseline
```

---
If you'd like, I can also: 
- Add a pre-commit secret scan using Husky + `gitleaks` and configure a blocking pre-commit hook (already added), and
- Run a quick `gitleaks` scan to flag other possible leaks. Use `npm run scan:secrets` to run manually, or run `npx gitleaks detect --source .`.

How to enable the pre-commit hook locally:

1. Install dev deps and prepare Husky:

```bash
npm install
npm run prepare
```

2. Confirm pre-commit hook is installed in `.husky/pre-commit` (it runs `npm run scan:secrets`).

3. Run the scanner manually if you want to examine results without committing:

```bash
npm run scan:secrets
# Output (gitleaks-report.json) saved on failure
```

If you want I can run an initial `gitleaks` scan now and produce a short report with findings and suggested remediations.
