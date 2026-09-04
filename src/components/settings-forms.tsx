"use client";

import { toast } from "sonner";
import { Button } from "./ui/button";
import { Badge, Card, Input } from "./ui/input";

export function SettingsForms({
  user,
  linkedin,
  secrets,
  billingEnabled,
  plans,
}: {
  user: { name: string; email: string; plan: string; role: string };
  linkedin: { connected: boolean; demo?: boolean; displayName?: string | null };
  secrets: Array<{ id: string; provider: string; name: string }>;
  billingEnabled: boolean;
  plans: Array<{ id: string; name: string; price: number; description: string }>;
}) {
  async function saveSecret(formData: FormData) {
    const response = await fetch("/api/secrets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: formData.get("provider"),
        name: "default",
        value: formData.get("value"),
      }),
    });
    if (!response.ok) {
      toast.error("Could not store secret");
      return;
    }
    toast.success("Secret stored encrypted. It will never be shown again.");
  }

  async function checkout(plan: "pro" | "team") {
    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const json = await response.json();
    if (json.url) {
      window.location.assign(json.url);
    } else {
      toast.error(json.error ?? "Billing is not configured");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="display text-5xl">Settings</h1>
      <Card className="p-6">
        <h2 className="display text-3xl">Account</h2>
        <p className="mt-2 text-sm text-muted">
          {user.name} · {user.email} · plan {user.plan}
          {user.role === "ADMIN" ? " · admin" : ""}
        </p>
      </Card>
      <Card className="p-6">
        <h2 className="display text-3xl">LinkedIn</h2>
        <p className="mt-2 text-sm text-muted">OAuth only. Postara never stores a LinkedIn password.</p>
        <div className="mt-4 flex items-center gap-3">
          <Badge tone={linkedin.connected ? "good" : "warn"}>
            {linkedin.connected ? `Connected${linkedin.demo ? " (demo)" : ""}` : "Not connected"}
          </Badge>
          <Button asChild size="sm">
            <a href="/api/linkedin/connect">Connect LinkedIn</a>
          </Button>
        </div>
      </Card>
      <Card className="p-6">
        <h2 className="display text-3xl">AI keys</h2>
        <p className="mt-2 text-sm text-muted">
          OpenRouter is the default gateway. Production default model is <code>openrouter/free</code> (OpenRouter
          free tier). Cheap fallback: <code>google/gemini-2.5-flash-lite</code>.
        </p>
        <form
          className="mt-4 grid gap-3 sm:grid-cols-[160px_1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            void saveSecret(new FormData(event.currentTarget));
            event.currentTarget.reset();
          }}
        >
          <select name="provider" className="h-11 rounded-xl border border-line bg-bg-elevated px-3 text-sm">
            <option value="openrouter">OpenRouter</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="custom">Custom / Ollama</option>
            <option value="resend">Resend</option>
          </select>
          <Input name="value" type="password" placeholder="Paste a key — it is encrypted at rest" required />
          <Button type="submit">Save</Button>
        </form>
        <div className="mt-4 space-y-2">
          {secrets.map((secret) => (
            <div key={secret.id} className="flex items-center justify-between text-sm">
              <span>
                {secret.provider} / {secret.name}
              </span>
              <Badge>configured</Badge>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-6">
        <h2 className="display text-3xl">Billing</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-2xl border border-line p-4">
              <p className="font-medium">{plan.name}</p>
              <p className="display text-3xl">${plan.price}</p>
              <p className="mt-2 text-sm text-muted">{plan.description}</p>
              {plan.id !== "free" && billingEnabled ? (
                <Button className="mt-4" size="sm" onClick={() => void checkout(plan.id as "pro" | "team")}>
                  Upgrade
                </Button>
              ) : null}
            </div>
          ))}
        </div>
        {!billingEnabled ? (
          <p className="mt-4 text-sm text-muted">Stripe keys are optional. Self-hosted instances can ignore billing.</p>
        ) : null}
      </Card>
    </div>
  );
}
