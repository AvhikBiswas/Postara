"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Badge, Card } from "./ui/input";
import { formatDateTime } from "@/lib/utils";

export function AutomationPanel({
  workflow,
}: {
  workflow: {
    id: string;
    name: string;
    status: string;
    nextRunAt: Date | string | null;
    lastRunAt: Date | string | null;
    scheduleLabel: string;
  };
}) {
  const router = useRouter();

  async function patch(status: string) {
    const current = await fetch(`/api/workflows/${workflow.id}`).then((r) => r.json());
    await fetch(`/api/workflows/${workflow.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...current, status }),
    });
    toast.success(status === "active" ? "Autopilot resumed" : "Autopilot paused");
    router.refresh();
  }

  async function runNow() {
    const response = await fetch(`/api/workflows/${workflow.id}/run`, { method: "POST" });
    const json = await response.json();
    if (!response.ok) {
      toast.error(json.error ?? "Could not run");
      return;
    }
    router.push(`/executions/${json.id}`);
  }

  return (
    <Card className="max-w-xl p-8">
      <p className="text-sm uppercase tracking-[0.18em] text-muted">Automation</p>
      <h1 className="display mt-2 text-5xl">LinkedIn Autopilot</h1>
      <div className="mt-5 flex items-center gap-3">
        <Badge tone={workflow.status === "active" ? "good" : "warn"}>
          ● {workflow.status === "active" ? "Active" : "Paused"}
        </Badge>
        <span className="text-sm text-muted">{workflow.scheduleLabel}</span>
      </div>
      <p className="mt-6 text-muted">Next run</p>
      <p className="display text-3xl">{formatDateTime(workflow.nextRunAt)}</p>
      <p className="mt-2 text-sm text-muted">Last run {formatDateTime(workflow.lastRunAt)}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={() => void runNow()}>Run now</Button>
        <Button variant="outline" onClick={() => void patch(workflow.status === "active" ? "paused" : "active")}>
          {workflow.status === "active" ? "Pause" : "Resume"}
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/autopilot">Edit</Link>
        </Button>
      </div>
    </Card>
  );
}
