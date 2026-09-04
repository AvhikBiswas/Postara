# Vercel

The full production checklist (credentials, OpenRouter free models, Supabase, Vercel import) is in [setup.md](setup.md).

Short version:

```bash
APP_URL=https://YOUR_PROJECT.vercel.app pnpm env:vercel
# fill DATABASE_URL, DIRECT_URL, OPENROUTER_API_KEY, ADMIN_EMAIL, ADMIN_PASSWORD
# Vercel → Settings → Environment Variables → Import .env.vercel
```

There is only one template: `.env.example`. `pnpm env:vercel` generates the file you upload.
