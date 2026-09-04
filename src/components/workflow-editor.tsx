"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { NodeType, WorkflowDefinition, WorkflowStep } from "@/lib/engine/types";
import { NODE_TYPES } from "@/lib/engine/types";
import { Button } from "./ui/button";
import { Badge, Card, Input, Label, Textarea } from "./ui/input";

const NODE_LABELS: Record<NodeType, string> = {
  schedule: "Schedule",
  manual: "Manual",
  llm: "LLM",
  http: "HTTP",
  condition: "Condition",
  email: "Email",
  approval: "Approval",
  linkedin: "LinkedIn",
  research: "Research",
  risk_check: "Risk check",
};

function emptyStep(type: NodeType): WorkflowStep {
  return {
    id: `${type}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    name: NODE_LABELS[type],
    config: {},
  };
}

export function WorkflowEditor({
  workflow,
}: {
  workflow?: { id?: string; name: string; description?: string; status?: string; definition: WorkflowDefinition };
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"visual" | "json">("visual");
  const [name, setName] = useState(workflow?.name ?? "Untitled workflow");
  const [status, setStatus] = useState(workflow?.status ?? "draft");
  const [definition, setDefinition] = useState<WorkflowDefinition>(
    workflow?.definition ?? {
      version: 1,
      trigger: { type: "manual" },
      steps: [emptyStep("llm")],
    },
  );
  const [jsonText, setJsonText] = useState(JSON.stringify(definition, null, 2));
  const [selected, setSelected] = useState(0);
  const [pending, setPending] = useState(false);
  const selectedStep = definition.steps[selected];

  const graph = useMemo(() => definition.steps, [definition]);

  function applyJson() {
    try {
      const parsed = JSON.parse(jsonText) as WorkflowDefinition;
      setDefinition(parsed);
      setMode("visual");
    } catch {
      toast.error("Invalid JSON");
    }
  }

  async function save() {
    setPending(true);
    const payload = {
      name,
      status,
      definition: mode === "json" ? JSON.parse(jsonText) : definition,
    };
    const response = await fetch(workflow?.id ? `/api/workflows/${workflow.id}` : "/api/workflows", {
      method: workflow?.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await response.json();
    setPending(false);
    if (!response.ok) {
      toast.error(json.error ?? "Could not save");
      return;
    }
    toast.success("Workflow saved");
    router.push(`/workflows/${json.id}`);
    router.refresh();
  }

  function download() {
    const blob = new Blob([JSON.stringify(definition, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/\s+/g, "-").toLowerCase()}.workflow.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function updateStep(patch: Partial<WorkflowStep>) {
    setDefinition((current) => ({
      ...current,
      steps: current.steps.map((step, index) => (index === selected ? { ...step, ...patch } : step)),
    }));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-muted">Advanced mode</p>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-2 max-w-md text-lg" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={mode === "visual" ? "default" : "outline"} size="sm" onClick={() => setMode("visual")}>
            Visual
          </Button>
          <Button
            variant={mode === "json" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setJsonText(JSON.stringify(definition, null, 2));
              setMode("json");
            }}
          >
            JSON
          </Button>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-8 rounded-full border border-line bg-bg-elevated px-3 text-xs"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
          <Button variant="outline" size="sm" onClick={download}>
            Export
          </Button>
          <Button size="sm" onClick={() => void save()} disabled={pending}>
            Save
          </Button>
        </div>
      </div>

      {mode === "json" ? (
        <Card className="p-4">
          <Textarea className="min-h-[480px] font-mono text-xs" value={jsonText} onChange={(e) => setJsonText(e.target.value)} />
          <div className="mt-3">
            <Button variant="outline" onClick={applyJson}>
              Apply JSON to visual editor
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[220px_1fr_320px]">
          <Card className="p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Nodes</p>
            <div className="mt-3 flex flex-col gap-2">
              {NODE_TYPES.filter((type) => type !== "schedule" && type !== "manual").map((type) => (
                <button
                  key={type}
                  type="button"
                  className="rounded-xl border border-line px-3 py-2 text-left text-sm hover:bg-bg"
                  onClick={() =>
                    setDefinition((current) => ({ ...current, steps: [...current.steps, emptyStep(type)] }))
                  }
                >
                  {NODE_LABELS[type]}
                </button>
              ))}
            </div>
          </Card>
          <div className="flex flex-col items-center gap-0 py-4">
            <Card className="w-full max-w-sm p-4 text-center">
              <p className="text-xs text-muted">Trigger</p>
              <select
                className="mt-2 h-10 w-full rounded-xl border border-line bg-bg-elevated px-3 text-sm"
                value={definition.trigger.type}
                onChange={(e) =>
                  setDefinition((current) => ({
                    ...current,
                    trigger:
                      e.target.value === "schedule"
                        ? { type: "schedule", cron: "0 9 * * 1-5" }
                        : { type: "manual" },
                  }))
                }
              >
                <option value="schedule">Schedule</option>
                <option value="manual">Manual</option>
              </select>
              {definition.trigger.type === "schedule" ? (
                <Input
                  className="mt-2"
                  value={definition.trigger.cron}
                  onChange={(e) =>
                    setDefinition((current) => ({
                      ...current,
                      trigger: { type: "schedule", cron: e.target.value },
                    }))
                  }
                />
              ) : null}
            </Card>
            {graph.map((step, index) => (
              <div key={step.id} className="flex w-full max-w-sm flex-col items-center">
                <div className="h-6 w-px bg-line" />
                <button
                  type="button"
                  onClick={() => setSelected(index)}
                  className={`w-full rounded-2xl border px-4 py-4 text-left ${
                    selected === index ? "border-ink bg-bg-elevated" : "border-line bg-bg-elevated/70"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{step.name ?? step.id}</span>
                    <Badge>{NODE_LABELS[step.type]}</Badge>
                  </div>
                </button>
              </div>
            ))}
          </div>
          <Card className="p-5">
            {selectedStep ? (
              <div className="space-y-3">
                <h2 className="display text-3xl">{selectedStep.name ?? selectedStep.id}</h2>
                <div>
                  <Label>Name</Label>
                  <Input value={selectedStep.name ?? ""} onChange={(e) => updateStep({ name: e.target.value })} />
                </div>
                {selectedStep.type === "llm" || selectedStep.type === "research" ? (
                  <>
                    <div>
                      <Label>Model</Label>
                      <Input
                        value={String(selectedStep.config?.model ?? "")}
                        onChange={(e) =>
                          updateStep({ config: { ...selectedStep.config, model: e.target.value } })
                        }
                        placeholder="openrouter/free"
                      />
                    </div>
                    <div>
                      <Label>System prompt</Label>
                      <Textarea
                        value={String(selectedStep.config?.system ?? "")}
                        onChange={(e) =>
                          updateStep({ config: { ...selectedStep.config, system: e.target.value } })
                        }
                      />
                    </div>
                    <div>
                      <Label>User prompt</Label>
                      <Textarea
                        value={String(selectedStep.config?.user ?? selectedStep.config?.topics ?? "")}
                        onChange={(e) =>
                          updateStep({
                            config: {
                              ...selectedStep.config,
                              [selectedStep.type === "research" ? "topics" : "user"]: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </>
                ) : null}
                {selectedStep.type === "http" ? (
                  <>
                    <div>
                      <Label>URL</Label>
                      <Input
                        value={String(selectedStep.config?.url ?? "")}
                        onChange={(e) => updateStep({ config: { ...selectedStep.config, url: e.target.value } })}
                      />
                    </div>
                    <div>
                      <Label>Method</Label>
                      <Input
                        value={String(selectedStep.config?.method ?? "GET")}
                        onChange={(e) => updateStep({ config: { ...selectedStep.config, method: e.target.value } })}
                      />
                    </div>
                  </>
                ) : null}
                {selectedStep.type === "email" ? (
                  <>
                    <div>
                      <Label>To</Label>
                      <Input
                        value={String(selectedStep.config?.to ?? "")}
                        onChange={(e) => updateStep({ config: { ...selectedStep.config, to: e.target.value } })}
                      />
                    </div>
                    <div>
                      <Label>Subject</Label>
                      <Input
                        value={String(selectedStep.config?.subject ?? "")}
                        onChange={(e) =>
                          updateStep({ config: { ...selectedStep.config, subject: e.target.value } })
                        }
                      />
                    </div>
                    <div>
                      <Label>Body</Label>
                      <Textarea
                        value={String(selectedStep.config?.body ?? "")}
                        onChange={(e) => updateStep({ config: { ...selectedStep.config, body: e.target.value } })}
                      />
                    </div>
                  </>
                ) : null}
                {selectedStep.type === "condition" ? (
                  <div>
                    <Label>Expression</Label>
                    <Input
                      value={
                        typeof selectedStep.next === "object"
                          ? selectedStep.next.expression
                          : String(selectedStep.config?.expression ?? "")
                      }
                      onChange={(e) =>
                        updateStep({
                          next: {
                            expression: e.target.value,
                            then:
                              typeof selectedStep.next === "object" ? selectedStep.next.then : "approval",
                            else:
                              typeof selectedStep.next === "object" ? selectedStep.next.else : "publish",
                          },
                        })
                      }
                    />
                  </div>
                ) : null}
                <p className="text-xs text-muted">
                  Variables: {"{{topic}}"} {"{{research}}"} {"{{write}}"} {"{{user.name}}"} {"{{date}}"}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted">Select a node to configure it.</p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
