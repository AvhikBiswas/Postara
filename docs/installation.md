# Installation

## Local development (Supabase)

Requirements: Node 22+, pnpm 10+, a Supabase project.

```bash
git clone https://github.com/AvhikBiswas/Postara.git
cd Postara
cp .env.example .env
```

Paste your Supabase pooler URIs into `.env` as `DATABASE_URL` and `DIRECT_URL`. Generate `AUTH_SECRET`, `ENCRYPTION_KEY`, and `APPROVAL_SIGNING_KEY`:

```bash
openssl rand -base64 32
openssl rand -hex 32
```

Then:

```bash
pnpm install
pnpm db:migrate
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and create an account at `/register`.

The web process also starts the in-process worker and scheduler. Redis is optional locally.

### Environment

| Variable | Purpose |
| --- | --- |
| `AUTH_SECRET` | Auth.js session secret |
| `DATABASE_URL` | Supabase transaction pooler (port 6543, `pgbouncer=true`) |
| `DIRECT_URL` | Supabase session / direct URI (port 5432) for migrations |
| `ENCRYPTION_KEY` | 32-byte hex key for secrets and OAuth tokens |
| `APPROVAL_SIGNING_KEY` | HMAC key for approval URLs |
| `OPENROUTER_API_KEY` | Default LLM gateway |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | LinkedIn OAuth |
| `RESEND_API_KEY` | Approval emails |
| `REDIS_URL` | BullMQ. Unset = in-process / inline queue |
| `CRON_SECRET` | Protects `/api/cron/tick` on Vercel |
| `STRIPE_*` | Optional billing |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | First admin, only when the database is empty |

## Vercel

See [vercel.md](vercel.md). Import `env.vercel.example` (after filling it) or the generated `.env.vercel`.

## Docker (self-host against Supabase)

```bash
cp .env.example .env
# set DATABASE_URL, DIRECT_URL, AUTH_SECRET, ENCRYPTION_KEY, APPROVAL_SIGNING_KEY
docker compose up --build
```

Compose starts `web`, `worker`, and `redis`. The database is Supabase — there is no local Postgres password in the repo.

## LinkedIn

Create a LinkedIn Developer app, enable Sign In with LinkedIn and Share on LinkedIn, and set the redirect URI to `{APP_URL}/api/linkedin/callback`. Never collect LinkedIn passwords.
