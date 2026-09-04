# Upgrade guide

1. Pull the new release or image tag.
2. Back up the Supabase project (Dashboard → Database → Backups).
3. Apply schema updates:

```bash
pnpm db:migrate
```

On Vercel this also runs during `pnpm build:vercel`.

4. Recreate self-hosted containers if you use Docker:

```bash
docker compose up --build -d
```

5. Confirm:

- `/dashboard` loads
- a manual Autopilot run completes
- encrypted secrets still decrypt (do not rotate `ENCRYPTION_KEY` unless you re-encrypt)

## Breaking changes to watch

- `ENCRYPTION_KEY` and `APPROVAL_SIGNING_KEY` must stay stable or existing tokens/secrets become unreadable.
- Workflow JSON is version `1`. Import files from older drafts that omit `version` will fail validation.
- LinkedIn tokens live in `Connection.encryptedAccessToken`. Disconnect/reconnect after a key rotation.
- V1 now requires PostgreSQL (`DATABASE_URL` + `DIRECT_URL`). SQLite file URLs are no longer valid.

## Rollback

Restore the Supabase backup, then start the previous image / deployment. Workflow JSON is forward-compatible within V1; executions already written keep their node state.
