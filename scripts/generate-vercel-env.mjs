import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const appUrl = process.env.APP_URL || "https://YOUR_PROJECT.vercel.app";

const env = {
  APP_URL: appUrl,
  NODE_ENV: "production",
  AUTH_SECRET: randomBytes(32).toString("base64"),
  NEXTAUTH_URL: appUrl,
  DATABASE_URL: process.env.DATABASE_URL || "",
  DIRECT_URL: process.env.DIRECT_URL || "",
  ENCRYPTION_KEY: randomBytes(32).toString("hex"),
  APPROVAL_SIGNING_KEY: randomBytes(32).toString("hex"),
  CRON_SECRET: randomBytes(32).toString("hex"),
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
  CUSTOM_LLM_BASE_URL: process.env.CUSTOM_LLM_BASE_URL || "",
  CUSTOM_LLM_API_KEY: process.env.CUSTOM_LLM_API_KEY || "",
  DEFAULT_LLM_MODEL: process.env.DEFAULT_LLM_MODEL || "openai/gpt-4o-mini",
  LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID || "",
  LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET || "",
  LINKEDIN_REDIRECT_URI: `${appUrl}/api/linkedin/callback`,
  RESEND_API_KEY: process.env.RESEND_API_KEY || "",
  EMAIL_FROM: process.env.EMAIL_FROM || "",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "",
  STRIPE_PRICE_PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY || "",
  STRIPE_PRICE_TEAM_MONTHLY: process.env.STRIPE_PRICE_TEAM_MONTHLY || "",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
  SENTRY_DSN: process.env.SENTRY_DSN || "",
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN || "",
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "",
  DEMO_MODE: "false",
  REDIS_URL: process.env.REDIS_URL || "",
};

const body = Object.entries(env)
  .map(([key, value]) => `${key}=${value}`)
  .join("\n");

const out = resolve(process.cwd(), ".env.vercel");
writeFileSync(out, `${body}\n`, { mode: 0o600 });
console.info(`Wrote ${out}`);
console.info("Paste DATABASE_URL and DIRECT_URL from Supabase, then import this file in Vercel.");
