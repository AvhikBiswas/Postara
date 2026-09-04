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
pnpm install
pnpm db:migrate
pnpm dev
```

Open [http://localhost:3000/tour](http://localhost:3000/tour) for the product walkthrough.

Production (Supabase + Vercel + OpenRouter free models): **[docs/setup.md](docs/setup.md)**

```bash
APP_URL=https://YOUR_PROJECT.vercel.app pnpm env:vercel
# fill DATABASE_URL, DIRECT_URL, OPENROUTER_API_KEY, ADMIN_*
# import .env.vercel in Vercel → Environment Variables
```

There is one env template: `.env.example`. `pnpm env:vercel` generates the upload file.

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
