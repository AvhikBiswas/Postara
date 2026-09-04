"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/input";

export function ApprovalActions({ token, initialContent }: { token: string; initialContent: string }) {
  const [content, setContent] = useState(initialContent);
  const [done, setDone] = useState("");
  const [error, setError] = useState("");

  async function decide(decision: "approved" | "rejected" | "edited") {
    const response = await fetch(`/api/approvals/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, content }),
    });
    const json = await response.json();
    if (!response.ok) {
      setError(json.error);
      return;
    }
    setDone(decision);
  }

  if (done) {
    return <p className="mt-6 text-good">Decision recorded: {done}.</p>;
  }

  return (
    <>
      <Textarea className="mt-5" value={content} onChange={(e) => setContent(e.target.value)} />
      {error ? <p className="mt-3 text-sm text-bad">{error}</p> : null}
      <div className="mt-5 flex flex-wrap gap-3">
        <Button variant="forest" onClick={() => void decide("approved")}>
          Approve & Publish
        </Button>
        <Button variant="outline" onClick={() => void decide("rejected")}>
          Reject
        </Button>
        <Button onClick={() => void decide("edited")}>Edit & publish</Button>
      </div>
    </>
  );
}
