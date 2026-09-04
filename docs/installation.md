# Installation

Use [setup.md](setup.md) for the complete production + Vercel guide.

Local against Supabase:

```bash
cp .env.example .env
pnpm install
pnpm db:migrate
pnpm dev
```

Docker (still uses Supabase as the database):

```bash
cp .env.example .env
docker compose up --build
```
