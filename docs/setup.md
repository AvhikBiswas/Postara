# Postara production setup

One env file. One deploy path. Cheap OpenRouter models.

There used to be two example files (`.env.example` and `env.vercel.example`). That was confusing. **There is only `.env.example` now.**

- Local: `cp .env.example .env`
- Vercel: `pnpm env:vercel` writes a gitignored `.env.vercel` you import

## Quick prod tour (after deploy)

1. Open your Vercel URL → **Create account** (`/register`) or sign in as the admin you set in env.
2. **Dashboard** — posts today, scheduled, awaiting approval.
3. **Autopilot** — topics, weekday/time, your voice. Connect LinkedIn (OAuth) or use the demo connection. **Start Autopilot**.
4. **Automation** — Active / next run. Click **Run now**.
5. **Execution** — Research → Write → Risk → Publish (or wait for approval if risk is high). Click a node for input, output, tokens, time, cost.
6. **Approvals** — high-risk posts. The email link is signed and expires.
7. **Workflows** — Advanced: visual editor, JSON, AI builder, import/export. Same engine as Autopilot.
8. **Settings** — OpenRouter key (if you did not set it in Vercel), LinkedIn, billing.
9. **Admin** — revenue / usage (admin role only).

In-app copy of this path: `/tour`.

## Credentials you actually need

### Required

| Variable | Where to get it | What it is |
| --- | --- | --- |
| `APP_URL` | Your Vercel domain | `https://your-app.vercel.app` — no trailing slash |
| `NEXTAUTH_URL` | Same as `APP_URL` | Auth.js canonical URL |
| `AUTH_SECRET` | `openssl rand -base64 32` or `pnpm env:vercel` | Session signing |
| `DATABASE_URL` | Supabase → Database → Connect → **Transaction pooler** (`:6543`) | App queries. Add `?pgbouncer=true` if missing |
| `DIRECT_URL` | Supabase → **Session pooler** or **Direct** (`:5432`) | Prisma migrations only |
| `ENCRYPTION_KEY` | `openssl rand -hex 32` | AES-256-GCM for API keys + LinkedIn tokens |
| `APPROVAL_SIGNING_KEY` | `openssl rand -hex 32` (different from encryption) | Signed approval links |
| `CRON_SECRET` | `openssl rand -hex 32` | Vercel cron hits `/api/cron/tick` |
| `OPENROUTER_API_KEY` | [openrouter.ai/keys](https://openrouter.ai/keys) | LLM gateway. Free tier is enough |
| `DEFAULT_LLM_MODEL` | see models below | Default `openrouter/free` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | You choose | First admin, **only if the database is empty** |

### Recommended so Autopilot is real

| Variable | Where | Why |
| --- | --- | --- |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | [LinkedIn Developers](https://www.linkedin.com/developers/) — create an app, enable **Sign In with LinkedIn** + **Share on LinkedIn** | OAuth only. Never a LinkedIn password |
| `LINKEDIN_REDIRECT_URI` | `{APP_URL}/api/linkedin/callback` | Must match the LinkedIn app exactly |
| `RESEND_API_KEY` | [resend.com](https://resend.com) | Approval emails |
| `EMAIL_FROM` | A verified Resend from-address | `Postara <noreply@yourdomain>` |

### Optional (skip for V1)

`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `CUSTOM_LLM_*`, `REDIS_URL`, all `STRIPE_*`, `SENTRY_*`, `DEMO_MODE`.

Do **not** set `DEMO_MODE=true` in production.

## Cheap / free OpenRouter models

Create a key at [openrouter.ai/keys](https://openrouter.ai/keys). No credit card required for free models.

| Model id | Cost | Use |
| --- | --- | --- |
| `openrouter/free` | $0 | **Default.** Router picks a live free model |
| `google/gemma-4-31b-it:free` | $0 | Strong free writer |
| `z-ai/glm-5.2:free` | $0 | General free writer |
| `minimax/minimax-m3:free` | $0 | Longer posts |
| `google/gemini-2.5-flash-lite` | ~$0.05 / $0.20 per 1M tokens | Paid fallback if free is rate-limited |

Set:

```
DEFAULT_LLM_MODEL=openrouter/free
```

You can change the model later on any LLM node in Advanced mode.

## Supabase (prod database)

1. [supabase.com/dashboard](https://supabase.com/dashboard) → New project → name `postara`.
2. **Project Settings → Database → Connect**.
3. Copy **Transaction pooler** → `DATABASE_URL` (port `6543`, add `?pgbouncer=true`).
4. Copy **Session pooler** or **Direct** → `DIRECT_URL` (port `5432`).
5. You do not need the Supabase JS anon key. Postara talks to Postgres through Prisma.

## Vercel deploy

1. Push this repo to GitHub. In Vercel: **Add New Project** → import the repo.
2. Framework: Next.js. Build command is already `pnpm build:vercel` via `vercel.json` (Prisma generate + migrate + Next build).
3. Generate the import file:

```bash
APP_URL=https://YOUR_PROJECT.vercel.app pnpm env:vercel
```

4. Open `.env.vercel` and paste:
   - `DATABASE_URL` and `DIRECT_URL` from Supabase
   - `OPENROUTER_API_KEY`
   - `ADMIN_EMAIL` and `ADMIN_PASSWORD`
   - LinkedIn + Resend if you have them
5. Vercel → **Settings → Environment Variables → Import** → upload `.env.vercel` → Production (and Preview if you want).
6. **Deploy**. The first build applies migrations to Supabase.
7. After the domain is assigned, set `APP_URL` / `NEXTAUTH_URL` / `LINKEDIN_REDIRECT_URI` to the real `https://….vercel.app` (or your custom domain) and redeploy.
8. LinkedIn app redirect URL must be exactly `{APP_URL}/api/linkedin/callback`.
9. Sign in. Walk `/tour`.

Hourly Autopilot: `vercel.json` cron `0 * * * *` → `/api/cron/tick`. Vercel sends `Authorization: Bearer $CRON_SECRET`. **Hobby** allows one cron per day — change the schedule to `0 9 * * *` if you are on Hobby.

## Local against the same Supabase project

```bash
cp .env.example .env
# paste the same DATABASE_URL, DIRECT_URL, secrets, OpenRouter key
pnpm install
pnpm db:migrate
pnpm dev
```

Register at `/register` or use `ADMIN_EMAIL` if the database is still empty.
