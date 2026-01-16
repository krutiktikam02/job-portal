# JobPortal Admin

This folder contains a standalone admin panel scaffold for the JobPortal project.
It uses Vite + React + Tailwind CSS and is intentionally separate from the `frontend/` and `backend/` folders so it can grow independently.

## What I added

- Vite React app scaffold in `admin/`
- Tailwind & PostCSS config
- `vite.config.js` configured to run the dev server on port **5174**
- Basic UI components: Navbar, Dashboard, Login, Users, Jobs

## Install & run (Windows PowerShell)

Open a PowerShell terminal at `admin/` and run:

```powershell
npm install
npm run dev
```

The dev server will start on http://localhost:5174

## Notes & integration

- I did not change any files under `frontend/` or `backend/`.
- The admin scaffold currently uses a simple client-side signin (accepts any creds) and placeholders for Users/Jobs.
- To connect to your existing backend APIs you can call endpoints from `../backend` (e.g., `http://localhost:<backend-port>/api/...`). If the backend runs on a different port, ensure CORS is enabled on the backend. I did not modify your backend; if you want, I can add example API calls and show any backend CORS changes required.

## Next steps I can help with

- Wire real API calls for auth, user/job management.
- Add React Router and protected routes for admin users.
- Add tests and build pipeline / deployment instructions.

If you want the admin to reuse exact UI components from `frontend/`, I can extract and share them next (but this may require small path/config changes).