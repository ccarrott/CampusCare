# Deploying Campus Care (free, on Render)

Campus Care is an Express + EJS + MySQL app. This guide gets it running on Render's
free tier, talking to your existing Aiven MySQL database, with no secrets in the repo.

## What's already in place
- `.env` and `*.pem` are gitignored and were **never committed** — no secrets in git history.
- The DB connection reads its SSL CA from the `DB_CA_CERT` env var (no file needed on the host).
- The server uses the host-injected `PORT` and enables `trust proxy` in production so secure
  session cookies work behind Render's HTTPS.
- `render.yaml` describes the service; `.env.example` documents every variable.

---

## 1. Push to GitHub
Your working tree already ignores secrets. Commit and push:
```
git add -A
git commit -m "Prepare for deployment"
git push
```
Confirm `.env` and `ca.pem` are NOT in the push (they're gitignored).

## 2. Get your database CA certificate (one-time)
Managed MySQL requires SSL. Render has no file system for `ca.pem`, so we pass the cert
as an env var:
1. Open the local `ca.pem` file (project root) — it's the Aiven CA certificate.
2. You'll paste its full contents into `DB_CA_CERT` in step 4.
   - It must be one value including the `-----BEGIN CERTIFICATE-----` / `-----END CERTIFICATE-----`
     lines. Render accepts multi-line values, so paste it as-is.
   - (If Aiven rotated it, download a fresh CA from the Aiven console → your MySQL service → "CA certificate".)

## 3. Create the Render service
Option A — Blueprint (uses `render.yaml`):
- Render dashboard → **New → Blueprint** → connect this repo → Apply.

Option B — manual:
- **New → Web Service** → connect the repo.
- Runtime: Node. Build command: `npm install`. Start command: `npm start`. Plan: Free.

## 4. Set environment variables (Render → your service → Environment)
Set these (values come from your local `.env`):

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `DB_HOST` | your Aiven host |
| `DB_PORT` | your Aiven port |
| `DB_USER` | your Aiven user |
| `DB_PASSWORD` | your Aiven password |
| `DB_NAME` | `defaultdb` |
| `DB_CA_CERT` | paste the full contents of `ca.pem` |
| `SESSION_SEED` | a long random hex string (Blueprint auto-generates one) |
| `APP_BASE_URL` | `https://<your-app>.onrender.com` (fill in after the URL exists) |
| `DAILY_API_KEY` | your Daily key (only if using video) |
| `DAILY_DOMAIN` | your Daily subdomain |
| `DAILY_WEBHOOK_SECRET` | your Daily webhook secret |
| `MAPTILER_KEY` | your MapTiler key (optional — map falls back to free tiles without it) |

Do NOT reuse the values that were in the local `.env` if this repo is public — rotate them
(see the checklist at the bottom).

## 5. Initialise the database (one-time)
After the first successful deploy, open Render → your service → **Shell** and run:
```
npm run setup          # migrations + symptom seed + zone seed
npm run state:showcase # optional: rich demo data
```
`npm run setup` is idempotent — safe to re-run.

## 6. Third-party dashboards (only if you use them)
- **MapTiler**: add `https://<your-app>.onrender.com` to the key's Allowed HTTP Origins.
- **Daily.co**: add your Render domain to allowed domains; set the webhook URL to
  `https://<your-app>.onrender.com/consultations/webhook/daily`. If your Daily subdomain
  isn't `campuscare`, update the `Permissions-Policy` in `src/config/security.js`.

## Notes
- Render free web services sleep after ~15 min idle; the next request cold-starts in ~30s.
  Fine for a demo/student project.
- The admin-only "state" endpoints (`showcase`/`outbreak`/`clear`/`naked`) remain available
  in production but are gated behind an admin login. `naked` deletes all data — use with care.

---

## Security checklist before going public
- [ ] Confirm `.env` and `ca.pem` are not in the repo (`git ls-files` shows neither).
- [ ] If the repo is public, ROTATE these (they were in the local `.env`): the Aiven DB
      password, `SESSION_SEED`, and the Daily API key/webhook secret. Set the new values
      only in Render's Environment tab.
- [ ] `MAPTILER_KEY` is a public browser key — no need to rotate, just origin-restrict it.
