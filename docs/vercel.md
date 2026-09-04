# Deploy Postara to Vercel + Supabase

Production uses **Supabase Postgres**. Do not use SQLite on Vercel.

## 1. Create the Supabase project

1. Open [https://supabase.com/dashboard](https://supabase.com/dashboard) and create a project named `postara`.
2. Project Settings → Database → Connect.
3. Copy two URIs:
   - **Transaction pooler** (port `6543`) → `DATABASE_URL`. Append `?pgbouncer=true` if it is missing.
   - **Session pooler** or **direct** (port `5432`) → `DIRECT_URL`.

Prisma talks to the pooler at runtime and uses `DIRECT_URL` only for `prisma migrate`.

## 2. Generate the Vercel env file

```bash
APP_URL=https://YOUR_PROJECT.vercel.app pnpm env:vercel
```

That writes a gitignored `.env.vercel` with real `AUTH_SECRET`, `ENCRYPTION_KEY`, `APPROVAL_SIGNING_KEY`, and `CRON_SECRET`.

Open `.env.vercel` and paste:

- `DATABASE_URL` and `DIRECT_URL` from Supabase
- `OPENROUTER_API_KEY` (or OpenAI / Anthropic)
- `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET`
- `RESEND_API_KEY` and `EMAIL_FROM`
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` for the first admin user (created only on an empty database)
- optional Stripe and Sentry keys

Leave `DEMO_MODE=false` in production.

## 3. Import into Vercel

Vercel → Project Settings → Environment Variables → **Import .env** → upload `.env.vercel`.

Apply the variables to Production (and Preview if you want).

LinkedIn redirect URI must be:

```
https://YOUR_PROJECT.vercel.app/api/linkedin/callback
```

## 4. Deploy

Connect the GitHub repo. The Vercel build runs `pnpm build:vercel`, which generates the Prisma client and applies migrations to Supabase.

Scheduled Autopilot runs are triggered by `/api/cron/tick` (hourly). Vercel sends `Authorization: Bearer $CRON_SECRET`. Hobby plans only allow one cron per day — change `vercel.json` if you are on Hobby.

## 5. First login

Register at `/register`, or sign in with `ADMIN_EMAIL` after the first deploy (empty database only).
