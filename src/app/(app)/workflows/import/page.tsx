"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, Input, Textarea } from "@/components/ui/input";

export default function ImportWorkflowPage() {
  const router = useRouter();
  const [text, setText] = useState("");

  async function importJson() {
    try {
      const definition = JSON.parse(text);
      const response = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: definition.name ?? "Imported workflow",
          definition: definition.steps ? definition : definition.definition,
          status: "draft",
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        toast.error(json.error ?? "Import failed");
        return;
      }
      router.push(`/workflows/${json.id}`);
    } catch {
      toast.error("Invalid workflow JSON");
    }
  }

  return (
    <Card className="mx-auto max-w-3xl p-6">
      <h1 className="display text-4xl">Import workflow.json</h1>
      <Input
        className="mt-4"
        type="file"
        accept="application/json"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          setText(await file.text());
        }}
      />
      <Textarea className="mt-4 min-h-80 font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} />
      <Button className="mt-4" onClick={() => void importJson()}>
        Import
      </Button>
    </Card>
  );
}
