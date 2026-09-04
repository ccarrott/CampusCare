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
| `DAILY_DOMAIN` | your Daily subdomain — also drives the camera/mic Permissions-Policy and the CSP frame origin |
| `DAILY_WEBHOOK_SECRET` | your Daily webhook secret |
| `MAPTILER_KEY` | your MapTiler key (optional — map falls back to free tiles without it) |
| `ALLOW_INSECURE_PASSWORD_RESET` | leave UNSET. Only set to `true` to demo the reset flow — see the security checklist |

`DB_CA_CERT` is not optional in spirit: without it the app still connects over TLS but
does not verify the server's certificate, and it logs a warning on boot saying so.

Do NOT reuse the values that were in the local `.env` if this repo is public — rotate them
(see the checklist at the bottom).

## 5. Initialise the database (one-time)
After the first successful deploy, open Render → your service → **Shell** and run:
```
npm run setup          # schema + migrations + symptom seed + zone seed
npm run state:showcase # optional: rich demo data
```
`npm run setup` creates the base tables if they are missing, so it works against a
brand-new empty database as well as the existing one, and it is safe to re-run —
already-applied steps are reported as `[SKIP]` and do not fail the run.

## 6. Third-party dashboards (only if you use them)
- **MapTiler**: add `https://<your-app>.onrender.com` to the key's Allowed HTTP Origins.
- **Daily.co**: add your Render domain to allowed domains; set the webhook URL to
  `https://<your-app>.onrender.com/consultations/webhook/daily`. The `Permissions-Policy`
  and CSP frame origin are derived from `DAILY_DOMAIN`, so just set that env var
  correctly — no code change needed.

## Notes
- Render free web services sleep after ~15 min idle; the next request cold-starts in ~30s.
  Fine for a demo/student project.
- **Sessions are held in memory**, so every cold start, restart or deploy signs everyone
  out, and the service cannot be scaled past one instance. Node prints a warning about
  this on boot. If persistent logins matter, add `express-mysql-session` and pass a
  `store` to `createSessionMiddleware()` in `src/config/session.js`.
- The health check is `/healthz` — a plain 200 with no DB or session work.
- The admin-only "state" endpoints (`showcase`/`outbreak`/`clear`/`naked`) remain available
  in production but are gated behind an admin login. `naked` deletes all data — use with care.

---

## Security checklist before going public
- [ ] Confirm `.env` and `ca.pem` are not in the repo (`git ls-files` shows neither).
- [ ] If the repo is public, ROTATE these (they were in the local `.env`): the Aiven DB
      password, `SESSION_SEED`, and the Daily API key/webhook secret. Set the new values
      only in Render's Environment tab.
- [ ] `MAPTILER_KEY` is a public browser key — no need to rotate, just origin-restrict it.
- [ ] Set `DB_CA_CERT`. Without it the database connection is encrypted but unauthenticated.
- [ ] Leave `ALLOW_INSECURE_PASSWORD_RESET` unset. There is no mail server, so the reset
      link can only be rendered in the page — which means anyone who knows a student
      number could reset that account. In production the link is written to the server log
      instead, and the form gives the same neutral answer whether or not the account
      exists. Set the flag to `true` only for a supervised live demo, and unset it after.
- [ ] Change the seeded demo passwords (`admin123`, `nurse123`, `password123` in
      `src/config/states/`) before pointing anyone at the deployed URL.
