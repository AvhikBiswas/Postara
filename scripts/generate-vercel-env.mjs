import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const appUrl = process.env.APP_URL || "https://YOUR_PROJECT.vercel.app";
const lines = [
  "# Generated for Vercel import. Fill the empty REQUIRED lines, then:",
  "# Vercel → Project Settings → Environment Variables → Import.",
  "",
  `APP_URL=${appUrl}`,
  "NODE_ENV=production",
  `NEXTAUTH_URL=${appUrl}`,
  `AUTH_SECRET=${randomBytes(32).toString("base64")}`,
  "DATABASE_URL=",
  "DIRECT_URL=",
  `ENCRYPTION_KEY=${randomBytes(32).toString("hex")}`,
  `APPROVAL_SIGNING_KEY=${randomBytes(32).toString("hex")}`,
  `CRON_SECRET=${randomBytes(32).toString("hex")}`,
  `OPENROUTER_API_KEY=${process.env.OPENROUTER_API_KEY || ""}`,
  "DEFAULT_LLM_MODEL=openrouter/free",
  `ADMIN_EMAIL=${process.env.ADMIN_EMAIL || ""}`,
  `ADMIN_PASSWORD=${process.env.ADMIN_PASSWORD || ""}`,
  `LINKEDIN_CLIENT_ID=${process.env.LINKEDIN_CLIENT_ID || ""}`,
  `LINKEDIN_CLIENT_SECRET=${process.env.LINKEDIN_CLIENT_SECRET || ""}`,
  `LINKEDIN_REDIRECT_URI=${appUrl}/api/linkedin/callback`,
  `RESEND_API_KEY=${process.env.RESEND_API_KEY || ""}`,
  `EMAIL_FROM=${process.env.EMAIL_FROM || ""}`,
  "DEMO_MODE=false",
  `REDIS_URL=${process.env.REDIS_URL || ""}`,
];

const out = resolve(process.cwd(), ".env.vercel");
writeFileSync(out, `${lines.join("\n")}\n`, { mode: 0o600 });
console.info(`Wrote ${out}`);
console.info("Required empty fields: DATABASE_URL, DIRECT_URL, OPENROUTER_API_KEY, ADMIN_EMAIL, ADMIN_PASSWORD");
console.info("Then import .env.vercel in Vercel → Environment Variables.");
