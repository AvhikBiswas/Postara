import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLinkedInStatus } from "@/lib/services/linkedin";
import { listUserSecrets } from "@/lib/services/secrets";
import { billingEnabled, PLANS } from "@/lib/services/billing";
import { SettingsForms } from "@/components/settings-forms";

export default async function SettingsPage() {
  const session = await auth();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session!.user.id } });
  const [linkedin, secrets] = await Promise.all([
    getLinkedInStatus(user.id),
    listUserSecrets(user.id),
  ]);

  return (
    <SettingsForms
      user={{ name: user.name, email: user.email, plan: user.plan, role: user.role }}
      linkedin={linkedin}
      secrets={secrets}
      billingEnabled={billingEnabled()}
      plans={[...PLANS]}
    />
  );
}
