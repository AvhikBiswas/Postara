import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { buildAutopilotDefinition, DEFAULT_AUTOPILOT } from "@/lib/autopilot";
import { nextCronDate } from "@/lib/cron";
import { encryptSecret } from "@/lib/secrets";

let seeded = false;

function demoModeEnabled() {
  return process.env.DEMO_MODE === "true";
}

export async function ensureSeeded() {
  if (seeded) return;
  const count = await prisma.user.count();
  if (count > 0) {
    seeded = true;
    return;
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    await prisma.user.create({
      data: {
        name: "Postara Admin",
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 10),
        role: "ADMIN",
        plan: "team",
        stripeStatus: "active",
      },
    });
  }

  if (demoModeEnabled()) {
    const demoEmail = process.env.DEMO_USER_EMAIL?.trim().toLowerCase();
    const demoPassword = process.env.DEMO_USER_PASSWORD;
    if (demoEmail && demoPassword) {
      const demo = await prisma.user.create({
        data: {
          name: "Demo Operator",
          email: demoEmail,
          passwordHash: await bcrypt.hash(demoPassword, 10),
          role: "USER",
          plan: "pro",
          stripeStatus: "active",
        },
      });
      await prisma.connection.create({
        data: {
          userId: demo.id,
          provider: "linkedin",
          providerAccountId: "demo-linkedin",
          displayName: "Demo Operator",
          encryptedAccessToken: encryptSecret("demo-linkedin-token"),
          scopes: "w_member_social",
          metadata: JSON.stringify({ demo: true }),
        },
      });
      const definition = buildAutopilotDefinition(DEFAULT_AUTOPILOT);
      await prisma.workflow.create({
        data: {
          userId: demo.id,
          name: "LinkedIn Autopilot",
          description: "Research, write, risk-check, approve when needed, publish.",
          definition: JSON.stringify(definition),
          status: "paused",
          kind: "linkedin_autopilot",
          nextRunAt: nextCronDate(
            definition.trigger.type === "schedule" ? definition.trigger.cron : "0 9 * * 1-5",
          ),
        },
      });
    }
  }

  seeded = true;
}
