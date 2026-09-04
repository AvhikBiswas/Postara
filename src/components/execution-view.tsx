"use client";

import { useEffect, useState } from "react";
import { Badge, Card } from "./ui/input";

type Node = {
  id: string;
  stepId: string;
  name: string;
  type: string;
  status: string;
  input: unknown;
  output: unknown;
  model?: string | null;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  durationMs: number;
};

type Execution = {
  id: string;
  publicId: string;
  status: string;
  nodes: Node[];
  error?: string | null;
};

const STATUS_ICON: Record<string, string> = {
  SUCCESS: "✓",
  RUNNING: "●",
  WAITING_APPROVAL: "⏳",
  FAILED: "✕",
  PENDING: "○",
  CANCELLED: "–",
};

export function ExecutionView({ initial }: { initial: Execution }) {
  const [execution, setExecution] = useState(initial);
  const [selected, setSelected] = useState(initial.nodes[0]?.id ?? null);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const response = await fetch(`/api/executions/${initial.id}`, { cache: "no-store" });
      if (!response.ok || cancelled) return;
      const json = (await response.json()) as Execution;
      setExecution(json);
      if (["SUCCESS", "FAILED", "CANCELLED", "WAITING_APPROVAL"].includes(json.status)) return;
      window.setTimeout(() => void poll(), 1000);
    };
    if (!["SUCCESS", "FAILED", "CANCELLED"].includes(initial.status)) {
      void poll();
    }
    return () => {
      cancelled = true;
    };
  }, [initial.id, initial.status]);

  const node = execution.nodes.find((item) => item.id === selected) ?? execution.nodes[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <Card className="p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-muted">Execution</p>
        <h1 className="display mt-2 text-3xl">#{execution.publicId.replace("execution_", "")}</h1>
        <Badge className="mt-3" tone={execution.status === "SUCCESS" ? "good" : execution.status === "FAILED" ? "bad" : "warn"}>
          {execution.status}
        </Badge>
        <ol className="mt-6 space-y-3">
          {execution.nodes.map((item) => (
            <li key={item.id}>
              <button type="button" onClick={() => setSelected(item.id)} className="flex w-full items-center gap-3 text-left">
                <span>{STATUS_ICON[item.status] ?? "○"}</span>
                <span className={item.id === selected ? "font-medium" : "text-muted"}>{item.name}</span>
              </button>
            </li>
          ))}
        </ol>
      </Card>
      {node ? (
        <Card className="space-y-5 p-6">
          <h2 className="display text-4xl">{node.name}</h2>
          <Section title="INPUT" value={node.input} />
          {node.model ? <Section title="MODEL" value={node.model} /> : null}
          <Section title="OUTPUT" value={node.output} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="TOKENS" value={`In ${node.tokensIn} / Out ${node.tokensOut}`} />
            <Stat label="TIME" value={`${(node.durationMs / 1000).toFixed(2)} sec`} />
            <Stat label="COST" value={`$${node.costUsd.toFixed(3)}`} />
          </div>
        </Card>
      ) : (
        <Card className="p-6 text-muted">This run has not produced node output yet.</Card>
      )}
    </div>
  );
}

function Section({ title, value }: { title: string; value: unknown }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{title}</p>
      <pre className="mt-2 overflow-x-auto rounded-xl bg-bg p-3 text-xs leading-6">
        {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
