# Job Portal

Cleaned repository for local development and deployment.

## Quick start (local)
1. Copy `backend/.env.example` to `backend/.env` and fill with your local values (do NOT commit real `.env`).
2. Place service account JSON at `backend/gcs-key.json` (do NOT commit).
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the app (see `backend` and `frontend` packages if applicable)

## Git & Remote
- This repository has been cleaned of secrets. To push to GitHub:
  1. Create an empty repo on GitHub (e.g., `your-org/job-portal`).
  2. Add remote and push:
     ```bash
     git remote add origin git@github.com:yourorg/job-portal.git
     git branch -M main
     git push -u origin main
     ```
  3. Enable branch protection for `main`, require status checks (CI), and add repo secrets in GitHub settings.

## Security
- Check `docs/SECRETS.md` for steps to rotate keys and remove secrets from history.
- Pre-commit secret scan is enabled using Husky + gitleaks.
- CI will run gitleaks on all pushes/PRs.

If you want, I can create the remote repo using `gh` (if you have GitHub CLI installed) and push for you. Let me know if you want me to push the initial commit as well.