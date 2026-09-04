import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_TTL_MS = 1000 * 60 * 60 * 48;

function signingKey() {
  return process.env.APPROVAL_SIGNING_KEY || process.env.ENCRYPTION_KEY || "dev-approval-key";
}

export function signApprovalToken(input: {
  approvalId: string;
  executionId: string;
  expiresAt: number;
}): string {
  const payload = `${input.approvalId}.${input.executionId}.${input.expiresAt}`;
  const signature = createHmac("sha256", signingKey()).update(payload).digest("hex");
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

export function verifyApprovalToken(token: string): {
  approvalId: string;
  executionId: string;
  expiresAt: number;
} {
  const decoded = Buffer.from(token, "base64url").toString("utf8");
  const [approvalId, executionId, expiresRaw, signature] = decoded.split(".");
  if (!approvalId || !executionId || !expiresRaw || !signature) {
    throw new Error("Invalid approval token");
  }
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    throw new Error("Approval token expired");
  }
  const expected = createHmac("sha256", signingKey())
    .update(`${approvalId}.${executionId}.${expiresAt}`)
    .digest("hex");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new Error("Invalid approval token");
  }
  return { approvalId, executionId, expiresAt };
}

export function approvalExpiry(ttlMs = DEFAULT_TTL_MS) {
  return Date.now() + ttlMs;
}

export function hashToken(token: string) {
  return createHmac("sha256", signingKey()).update(token).digest("hex");
}
