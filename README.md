# Postara

Open-source AI automation. Build, schedule, review, and run AI-powered workflows — starting with LinkedIn autopilot.

Tell Postara what you want to post about. It researches, writes, checks risk, asks for approval when necessary, and publishes to LinkedIn.

You do not need to understand nodes to use it. Simple mode creates a workflow on the same engine that Advanced mode edits.

## The V1 idea

```
Schedule → Topic → Research → Write → Risk check
                                      ├─ LOW  → LinkedIn
                                      └─ HIGH → Email approval → LinkedIn
```

That workflow is just JSON. Everything else — dashboard, visual editor, AI builder, approvals — sits on top of one engine.

## Quick start

```bash
cp .env.example .env
# paste Supabase DATABASE_URL + DIRECT_URL, then generate secrets
pnpm install
pnpm db:migrate
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and create an account.

Production (Vercel + Supabase):

```bash
APP_URL=https://YOUR_PROJECT.vercel.app pnpm env:vercel
# paste Supabase and API keys into .env.vercel
# import that file in Vercel → Environment Variables
```

See [docs/vercel.md](docs/vercel.md), [docs/installation.md](docs/installation.md), and [docs/upgrade.md](docs/upgrade.md).

## What V1 includes

- LinkedIn Autopilot simple mode (no workflow jargon)
- Advanced visual + JSON editor on the same engine
- 8 public node types: Schedule, Manual, LLM, HTTP, Condition, Email, Approval, LinkedIn
- Research and risk-check as specialized LLM steps
- Model abstraction: OpenRouter default, plus OpenAI, Anthropic, and OpenAI-compatible endpoints
- Prompt variables: `{{topic}}`, `{{research}}`, `{{write}}`, `{{user.name}}`, `{{date}}`
- Signed, expiring approval links
- LinkedIn OAuth only — passwords are never stored
- Execution ids, per-node state, live run inspector
- Dashboard, automation controls, JSON import/export
- Encrypted secrets, audit log, rate limits, CSRF origin checks, SSRF guard on HTTP nodes
- Stripe Free / Pro / Team (optional)
- Admin revenue page
- Docker Compose: web, worker, Postgres, Redis, storage volume

## Architecture

```
                 Workflow JSON
                       ↓
                    Engine
                       ↓
             ┌─────────┴─────────┐
             ↓                   ↓
           Queue              State
             ↓                   ↓
          Worker              Supabase Postgres
```

LinkedIn, LLM, and email are nodes — not separate products.

## Stack

Next.js 16 · TypeScript · Tailwind · Prisma · Auth.js · BullMQ / in-process queue · OpenRouter · Resend · Stripe

## License

Apache 2.0
