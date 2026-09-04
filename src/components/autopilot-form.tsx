"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Badge, Card, Input, Label, Textarea } from "./ui/input";

type Props = {
  linkedin: { connected: boolean; demo?: boolean; displayName?: string | null; configured: boolean };
  defaults: { topics: string; frequency: string; time: string; instructions: string };
  workflow?: { id: string; status: string; scheduleLabel?: string } | null;
};

export function AutopilotForm({ linkedin, defaults, workflow }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [connected, setConnected] = useState(linkedin.connected);

  async function connectDemo() {
    const response = await fetch("/api/linkedin/demo", { method: "POST" });
    if (response.ok) {
      setConnected(true);
      toast.success("LinkedIn connected in demo mode");
    }
  }

  async function onSubmit(formData: FormData) {
    setPending(true);
    const response = await fetch("/api/autopilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topics: formData.get("topics"),
        frequency: formData.get("frequency"),
        time: formData.get("time"),
        instructions: formData.get("instructions"),
        status: "active",
      }),
    });
    setPending(false);
    if (!response.ok) {
      toast.error("Could not start Autopilot");
      return;
    }
    toast.success("Autopilot is live");
    router.push("/automation");
    router.refresh();
  }

  return (
    <Card className="mx-auto max-w-2xl p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-muted">Postara</p>
          <h1 className="display mt-2 text-5xl">Your LinkedIn Autopilot</h1>
        </div>
        {connected ? (
          <Badge tone="good">● Connected to LinkedIn{linkedin.demo ? " (demo)" : ""}</Badge>
        ) : (
          <Badge tone="warn">Not connected</Badge>
        )}
      </div>

      {!connected ? (
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <a href="/api/linkedin/connect">Connect LinkedIn</a>
          </Button>
          <Button type="button" variant="outline" onClick={() => void connectDemo()}>
            Use demo connection
          </Button>
        </div>
      ) : null}

      <form
        className="mt-8 space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit(new FormData(event.currentTarget));
        }}
      >
        <div>
          <Label htmlFor="topics">What should I post about?</Label>
          <Input
            id="topics"
            name="topics"
            defaultValue={defaults.topics}
            placeholder="AI engineering, startups, programming, SaaS..."
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="frequency">Posting frequency</Label>
            <select
              id="frequency"
              name="frequency"
              defaultValue={defaults.frequency}
              className="h-11 w-full rounded-xl border border-line bg-bg-elevated px-3 text-sm"
            >
              <option value="every_weekday">Every weekday</option>
              <option value="every_day">Every day</option>
              <option value="twice_week">Twice a week</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div>
            <Label htmlFor="time">Time</Label>
            <select
              id="time"
              name="time"
              defaultValue={defaults.time}
              className="h-11 w-full rounded-xl border border-line bg-bg-elevated px-3 text-sm"
            >
              {["07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM", "12:00 PM", "05:00 PM"].map((time) => (
                <option key={time}>{time}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <Label htmlFor="instructions">Your instructions</Label>
          <Textarea id="instructions" name="instructions" defaultValue={defaults.instructions} />
        </div>
        <div className="flex justify-center pt-2">
          <Button type="submit" variant="accent" size="lg" disabled={pending}>
            {pending ? "Starting…" : workflow ? "Update Autopilot" : "Start Autopilot"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
