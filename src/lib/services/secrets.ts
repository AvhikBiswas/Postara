import { prisma } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/secrets";
import { writeAudit } from "@/lib/audit";

export async function upsertUserSecret(input: {
  userId: string;
  provider: string;
  name: string;
  value: string;
  metadata?: unknown;
}) {
  const secret = await prisma.secret.upsert({
    where: {
      userId_provider_name: {
        userId: input.userId,
        provider: input.provider,
        name: input.name,
      },
    },
    update: {
      encryptedValue: encryptSecret(input.value),
      metadata: JSON.stringify(input.metadata ?? {}),
    },
    create: {
      userId: input.userId,
      provider: input.provider,
      name: input.name,
      encryptedValue: encryptSecret(input.value),
      metadata: JSON.stringify(input.metadata ?? {}),
    },
  });
  await writeAudit({ userId: input.userId, action: "secret.upserted", target: input.provider });
  return { id: secret.id, provider: secret.provider, name: secret.name, configured: true };
}

export async function listUserSecrets(userId: string) {
  const secrets = await prisma.secret.findMany({ where: { userId } });
  return secrets.map((secret) => ({
    id: secret.id,
    provider: secret.provider,
    name: secret.name,
    configured: true,
    updatedAt: secret.updatedAt,
  }));
}

export async function readUserSecret(userId: string, provider: string, name = "default") {
  const secret = await prisma.secret.findUnique({
    where: { userId_provider_name: { userId, provider, name } },
  });
  if (!secret) return null;
  return decryptSecret(secret.encryptedValue);
}

export async function deleteUserSecret(userId: string, id: string) {
  await prisma.secret.delete({ where: { id, userId } });
  await writeAudit({ userId, action: "secret.deleted", target: id });
}
