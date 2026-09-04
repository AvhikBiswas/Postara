"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, Textarea } from "@/components/ui/input";
import type { WorkflowDefinition } from "@/lib/engine/types";

export default function AiBuilderPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState(
    "Create a workflow that researches AI news every morning, selects the most interesting story, writes a LinkedIn post in my style, asks me for approval, then publishes it.",
  );
  const [definition, setDefinition] = useState<WorkflowDefinition | null>(null);
  const [pending, setPending] = useState(false);

  async function generate() {
    setPending(true);
    const response = await fetch("/api/workflows/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const json = await response.json();
    setPending(false);
    if (!response.ok) {
      toast.error(json.error ?? "Could not generate");
      return;
    }
    setDefinition(json.definition);
  }

  async function create() {
    if (!definition) return;
    const response = await fetch("/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "AI-built workflow", definition, status: "draft" }),
    });
    const json = await response.json();
    if (!response.ok) {
      toast.error(json.error ?? "Could not create");
      return;
    }
    router.push(`/workflows/${json.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.18em] text-muted">AI workflow builder</p>
        <h1 className="display text-5xl">Describe the automation.</h1>
      </div>
      <Card className="p-6">
        <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="min-h-40" />
        <div className="mt-4">
          <Button onClick={() => void generate()} disabled={pending}>
            {pending ? "Designing…" : "Generate workflow"}
          </Button>
        </div>
      </Card>
      {definition ? (
        <Card className="p-6">
          <h2 className="display text-3xl">I created this workflow</h2>
          <ol className="mt-4 space-y-2">
            {definition.steps.map((step) => (
              <li key={step.id} className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-ink" />
                {step.name ?? step.id}
              </li>
            ))}
          </ol>
          <Button className="mt-6" variant="accent" onClick={() => void create()}>
            Create Workflow
          </Button>
        </Card>
      ) : null}
    </div>
  );
}
