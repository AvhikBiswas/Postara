import { prisma } from "@/lib/db";
import { hashToken, verifyApprovalToken } from "@/lib/approval-token";
import { ApprovalActions } from "@/components/approval-actions";
import { BrandLogo } from "@/components/brand-logo";

export default async function PublicApprovePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const approval = await loadApproval(token);

  if (!approval) {
    return (
      <div className="grain flex min-h-screen items-center justify-center px-5">
        <div className="paper max-w-lg rounded-3xl border border-line p-8">
          <h1 className="display text-4xl">Link expired</h1>
          <p className="mt-3 text-muted">This approval link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grain flex min-h-screen items-center justify-center px-5 py-12">
      <div className="paper w-full max-w-2xl rounded-3xl border border-line p-8">
        <BrandLogo />
        <h1 className="mt-3 text-2xl font-medium">Your LinkedIn post is waiting for approval.</h1>
        <div className="mt-6 rounded-2xl bg-bg p-5">
          <p className="whitespace-pre-wrap leading-7">{approval.content}</p>
        </div>
        <p className="mt-4 text-sm">
          AI detected: <strong>Risk: {approval.riskLevel}</strong>
        </p>
        <p className="text-sm text-muted">{approval.riskReason}</p>
        {approval.status === "pending" ? (
          <ApprovalActions token={token} initialContent={approval.content} />
        ) : (
          <p className="mt-6 text-good">This post was already {approval.status}.</p>
        )}
      </div>
    </div>
  );
}

async function loadApproval(token: string) {
  try {
    const payload = verifyApprovalToken(token);
    const approval = await prisma.approval.findUnique({ where: { id: payload.approvalId } });
    if (!approval || approval.tokenHash !== hashToken(token)) return null;
    return approval;
  } catch {
    return null;
  }
}
