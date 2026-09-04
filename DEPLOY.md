# Deploying Campus Care for free

Campus Care is an Express + EJS + MySQL app with no build step, so hosting it is
mostly a matter of pointing a Node service at a MySQL database and setting
environment variables. This guide gets you a public HTTPS URL that behaves
**exactly like `npm start` on your laptop**, at no cost.

Two free pieces:

| Piece | Provider | Free tier |
|-------|----------|-----------|
| Web service | **Render** | 750 instance-hours/month; sleeps after ~15 min idle |
| Database | **Aiven for MySQL** | 1 shared CPU, 5 GB — free plan, no card |

You can swap either one (see [Alternatives](#alternatives)). Nothing in the app is
Render-specific.

---

## 0. Before you start

You need a GitHub account with this repository pushed, and about twenty minutes.
Have `.env` open — you will be copying values out of it.

Confirm no secrets are in the repo:

```bash
git ls-files | grep -E '\.env$|\.pem$'      # must print nothing
```

---

## 1. Create the database (Aiven)

1. Sign up at [aiven.io](https://aiven.io) — the free plan needs no card.
2. **Create service → MySQL → Free plan**. Pick the region closest to your users
   (`aws-eu-west-1` is a reasonable choice from South Africa; there is no free
   African region).
3. Wait for the service to reach **Running** (a few minutes).
4. From the service **Overview** tab collect:
   - Host, Port, User (`avnadmin`), Password, Database name (`defaultdb`)
   - **CA Certificate** — click *Download* and open the file in a text editor.
     You will paste its whole contents, `-----BEGIN CERTIFICATE-----` line included.

> Managed MySQL requires TLS. Campus Care reads the CA from the `DB_CA_CERT`
> environment variable, so no file needs to exist on the host. Skip it and the
> connection still works but is **unverified** — the app warns loudly on boot.

## 2. Create the web service (Render)

1. Sign up at [render.com](https://render.com) and connect your GitHub account.
2. **New → Blueprint**, pick this repository, **Apply**. Render reads
   `render.yaml` and creates the service with the right build and start commands.

   *Manual alternative:* **New → Web Service** → Runtime **Node**, Build
   `npm install`, Start `npm start`, Plan **Free**, Health check path `/healthz`.

3. Render will prompt for every variable marked `sync: false`. Fill them in from
   step 1, or add them later under **Environment**.

## 3. Set the environment variables

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `DB_HOST` | your Aiven host |
| `DB_PORT` | your Aiven port |
| `DB_USER` | `avnadmin` |
| `DB_PASSWORD` | your Aiven password |
| `DB_NAME` | `defaultdb` |
| `DB_CA_CERT` | **leave unset.** The CA ships in the repo as `ca.pem` and is read from disk. |
| `SESSION_SEED` | a long random hex string — the Blueprint generates one for you |
| `APP_TIMEZONE` | `Africa/Johannesburg` (already in `render.yaml`) |
| `DB_TIMEZONE` | `+02:00` (already in `render.yaml`) |
| `APP_BASE_URL` | `https://<your-app>.onrender.com` — fill in once the URL exists |
| `DEMO_ADMIN_PASSWORD` / `DEMO_NURSE_PASSWORD` / `DEMO_STUDENT_PASSWORD` | your own values — the repo defaults are public |
| `MAPTILER_KEY` | optional; without it the map uses free CARTO/OSM tiles |
| `DAILY_API_KEY` / `DAILY_DOMAIN` / `DAILY_WEBHOOK_SECRET` | only if you want video consultations |
| `ALLOW_INSECURE_PASSWORD_RESET` | leave unset — see the checklist at the bottom |

Need a random `SESSION_SEED`?

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 4. Initialise the database

After the first successful deploy, open **Render → your service → Shell**:

```bash
npm run setup            # schema + migrations + symptom seed + zone seed
npm run state:showcase   # optional: rich demo data
```

`npm run setup` builds the schema from nothing, so a brand-new Aiven database is
fine. It is safe to re-run — already-applied steps print `[SKIP]`.

> No Shell on the free plan? Run the same commands from your laptop with the
> Aiven values in your local `.env`; they talk to the same database.

## 5. Third-party dashboards (only if you use them)

- **MapTiler** — add `https://<your-app>.onrender.com` to the key's Allowed HTTP Origins.
- **Daily.co** — add your Render domain to allowed domains, and set the webhook URL to
  `https://<your-app>.onrender.com/consultations/webhook/daily`. The camera/mic
  `Permissions-Policy` and the CSP frame origin are derived from `DAILY_DOMAIN`, so
  just set that variable correctly — no code change needed.

---

## Will it behave like localhost?

Yes, and the things that usually break have been dealt with:

| Usually breaks in production | How Campus Care handles it |
|------------------------------|----------------------------|
| **Times shift by hours** — hosts run containers in UTC | The app pins its own timezone (`src/config/timezone.js`): Node's clock *and* the MySQL session both run at SAST, so bookable days, appointment times, expiry and trend windows match a machine in Gqeberha. |
| **Everyone signed out after a restart** | Sessions live in MySQL, not process memory, so they survive cold starts and redeploys. |
| **Secure cookies dropped behind a proxy** | `trust proxy` is enabled in production, so Render's HTTPS termination is understood. |
| **A CDN is blocked and the page half-loads** | Nothing is loaded from a CDN. Every script, stylesheet and webfont is served from your own origin. |
| **Assets are slow on mobile** | Responses are gzipped; images are sized to what is actually displayed. |
| **Database file paths don't exist on the host** | The TLS CA comes from an environment variable. |

Two genuine differences remain, both inherent to the free tier:

1. **Cold starts.** A free Render service sleeps after ~15 minutes of no traffic.
   The next request takes roughly 30–60 seconds while it wakes. Your session
   survives it, but the wait is real — **start your app a minute before a live
   demo**. Paid Render (\$7/month) removes this entirely.
2. **Shared CPU.** The free instance is small. Fine for a demo or a class of
   users; the heat-map query over a year of data is the heaviest thing it does.

If you want to reduce cold starts, a free uptime monitor (UptimeRobot,
cron-job.org) pinging `https://<your-app>.onrender.com/healthz` every 10 minutes
keeps it warm. Note that Render intends free services to sleep, so treat this as
a demo-day convenience rather than a permanent arrangement.

---

## Alternatives

| Host | Free tier | Notes |
|------|-----------|-------|
| **Render** | 750 hrs/month, sleeps when idle | What `render.yaml` targets. Easiest path. |
| **Fly.io** | Small always-on VMs | No sleep, so no cold starts. Requires a card for verification. Needs a `Dockerfile` or `fly launch`. |
| **Koyeb** | One free service, no sleep | Good Render alternative; same env-var setup. |
| **Railway** | Trial credit, then paid | Fine for a demo window; not free indefinitely. |
| **Vercel / Netlify** | — | **Not suitable.** They run serverless functions; this app is a long-lived Express server with a connection pool. |

For the database: Aiven MySQL (free), Railway MySQL (trial credit), or any MySQL 8
you can reach over TLS. PlanetScale removed its free tier.

---

## Updating a deployed app

Render redeploys automatically on every push to the connected branch.

```bash
git push origin main
```

Schema changes need `npm run setup` re-run afterwards (it only applies what is
missing). Watch **Logs** in the Render dashboard if a deploy misbehaves — a failed
boot prints the reason and exits rather than hanging.

---

## Security checklist before sharing the URL

- [ ] `.env` is not in the repo — `git ls-files | grep '\.env$'` shows nothing.
      (`ca.pem` **is** committed on purpose: it is the database's public CA
      certificate, holds no secret, and pasting it into `DB_CA_CERT` instead gets
      its newlines stripped by most dashboards — which silently drops you to an
      unverified TLS connection, or fails the handshake outright.)
- [ ] If the repo is public, **rotate** anything that was ever in your local `.env`:
      the Aiven password, `SESSION_SEED`, and the Daily API key and webhook secret.
      Set the new values only in Render's Environment tab.
- [ ] `DB_CA_CERT` is **unset** in the dashboard, so `ca.pem` from the repo is used.
      Set it only on a host with no filesystem. Without either, the database
      connection is encrypted but unauthenticated, and the app says so on boot.
- [ ] The demo passwords are overridden via `DEMO_*_PASSWORD`, and you have re-run
      `npm run state:naked`. The repo defaults are public knowledge.
- [ ] `ALLOW_INSECURE_PASSWORD_RESET` is **unset**. There is no mail server, so the
      reset link can only be rendered on the page — meaning anyone who knows a
      username could reset that account. In production the link goes to the server
      log instead, and the form gives the same neutral answer either way. Set the
      flag only for a supervised live demo, and unset it after.
- [ ] `MAPTILER_KEY` is origin-restricted in the MapTiler dashboard. It is a public
      browser key, so restriction is the protection, not secrecy.
- [ ] You are comfortable with the nurse portraits being used to depict fictional
      clinicians (see *Privacy & demo data* in the README), or you have removed them.

---

## Troubleshooting a deploy

| Symptom | Fix |
|---------|-----|
| Boot exits with `Missing required environment variables` | The named variables are not set in Render's Environment tab. |
| Boot exits with `Database connection failed` | Wrong `DB_*` values, or Aiven's IP allow-list is blocking Render. Aiven's free plan allows all IPs by default — check you did not restrict it. |
| `Server does not support secure connection` | You pointed `DB_*` at a MySQL without TLS. Managed instances all support it. |
| Health check keeps failing | Confirm the path is `/healthz`. It returns a plain `ok` with no database call, so a failure means the process is not listening at all — read the logs. |
| Signed out on every page load | The session cookie is `secure`. You are on plain HTTP, or `NODE_ENV` is not `production` so `trust proxy` is off. |
| Times two hours out | `APP_TIMEZONE` / `DB_TIMEZONE` have been overridden. Unset them to take the SAST defaults. |
| Deploy succeeds, pages 500 | Almost always an un-run migration. Open the Shell and run `npm run setup`. |
