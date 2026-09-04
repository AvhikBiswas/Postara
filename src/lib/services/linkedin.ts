import { prisma } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/secrets";
import { writeAudit } from "@/lib/audit";

const LINKEDIN_AUTH = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_ME = "https://api.linkedin.com/v2/userinfo";
const LINKEDIN_POSTS = "https://api.linkedin.com/rest/posts";

export function linkedinConfigured() {
  return Boolean(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET);
}

export function linkedinAuthorizeUrl(state: string) {
  const redirect = process.env.LINKEDIN_REDIRECT_URI ?? `${process.env.APP_URL}/api/linkedin/callback`;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINKEDIN_CLIENT_ID ?? "",
    redirect_uri: redirect,
    state,
    scope: "openid profile email w_member_social",
  });
  return `${LINKEDIN_AUTH}?${params.toString()}`;
}

export async function exchangeLinkedInCode(code: string) {
  const redirect = process.env.LINKEDIN_REDIRECT_URI ?? `${process.env.APP_URL}/api/linkedin/callback`;
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirect,
    client_id: process.env.LINKEDIN_CLIENT_ID ?? "",
    client_secret: process.env.LINKEDIN_CLIENT_SECRET ?? "",
  });
  const response = await fetch(LINKEDIN_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    throw new Error(`LinkedIn token exchange failed (${response.status})`);
  }
  return (await response.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    scope?: string;
  };
}

export async function saveLinkedInConnection(userId: string, tokens: {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}) {
  const me = await fetch(LINKEDIN_ME, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile = me.ok
    ? ((await me.json()) as { sub?: string; name?: string })
    : { sub: null, name: "LinkedIn" };

  await prisma.connection.upsert({
    where: { userId_provider: { userId, provider: "linkedin" } },
    update: {
      providerAccountId: profile.sub ?? undefined,
      displayName: profile.name ?? "LinkedIn",
      encryptedAccessToken: encryptSecret(tokens.access_token),
      encryptedRefreshToken: tokens.refresh_token ? encryptSecret(tokens.refresh_token) : undefined,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      scopes: tokens.scope,
      metadata: JSON.stringify({ demo: false }),
    },
    create: {
      userId,
      provider: "linkedin",
      providerAccountId: profile.sub,
      displayName: profile.name ?? "LinkedIn",
      encryptedAccessToken: encryptSecret(tokens.access_token),
      encryptedRefreshToken: tokens.refresh_token ? encryptSecret(tokens.refresh_token) : undefined,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      scopes: tokens.scope,
      metadata: JSON.stringify({ demo: false }),
    },
  });
  await writeAudit({ userId, action: "linkedin.connected", target: profile.sub ?? "linkedin" });
}

export async function connectDemoLinkedIn(userId: string, name: string) {
  await prisma.connection.upsert({
    where: { userId_provider: { userId, provider: "linkedin" } },
    update: {
      displayName: name,
      encryptedAccessToken: encryptSecret("demo-linkedin-token"),
      metadata: JSON.stringify({ demo: true }),
    },
    create: {
      userId,
      provider: "linkedin",
      providerAccountId: `demo-${userId}`,
      displayName: name,
      encryptedAccessToken: encryptSecret("demo-linkedin-token"),
      scopes: "w_member_social",
      metadata: JSON.stringify({ demo: true }),
    },
  });
}

export async function publishLinkedInForExecution(executionId: string) {
  const execution = await prisma.execution.findUnique({
    where: { id: executionId },
    include: { user: true },
  });
  if (!execution) return;
  const context = JSON.parse(execution.context) as { write?: unknown };
  const content = typeof context.write === "string" ? context.write : "";
  if (!content) return;

  const connection = await prisma.connection.findUnique({
    where: { userId_provider: { userId: execution.userId, provider: "linkedin" } },
  });

  let externalId = `demo-${execution.publicId}`;
  let status = "published";

  if (connection) {
    const metadata = JSON.parse(connection.metadata || "{}") as { demo?: boolean };
    if (!metadata.demo) {
      try {
        const accessToken = decryptSecret(connection.encryptedAccessToken);
        const personUrn = connection.providerAccountId
          ? `urn:li:person:${connection.providerAccountId}`
          : null;
        if (personUrn) {
          const response = await fetch(LINKEDIN_POSTS, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
              "X-Restli-Protocol-Version": "2.0.0",
              "LinkedIn-Version": "202401",
            },
            body: JSON.stringify({
              author: personUrn,
              commentary: content,
              visibility: "PUBLIC",
              distribution: {
                feedDistribution: "MAIN_FEED",
                targetEntities: [],
                thirdPartyDistributionChannels: [],
              },
              lifecycleState: "PUBLISHED",
              isReshareDisabledByAuthor: false,
            }),
          });
          if (!response.ok) {
            throw new Error(`LinkedIn publish failed (${response.status})`);
          }
          externalId = response.headers.get("x-restli-id") ?? externalId;
        }
      } catch (error) {
        status = "failed";
        await prisma.execution.update({
          where: { id: executionId },
          data: {
            error: error instanceof Error ? error.message : "LinkedIn publish failed",
          },
        });
      }
    }
  }

  await prisma.post.create({
    data: {
      userId: execution.userId,
      executionId,
      platform: "linkedin",
      content,
      status,
      publishedAt: status === "published" ? new Date() : null,
      externalId,
    },
  });
}

export async function getLinkedInStatus(userId: string) {
  const connection = await prisma.connection.findUnique({
    where: { userId_provider: { userId, provider: "linkedin" } },
  });
  if (!connection) {
    return { connected: false, configured: linkedinConfigured() };
  }
  const metadata = JSON.parse(connection.metadata || "{}") as { demo?: boolean };
  return {
    connected: true,
    demo: Boolean(metadata.demo),
    displayName: connection.displayName,
    configured: linkedinConfigured(),
  };
}
