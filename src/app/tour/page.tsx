import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

const stops = [
  {
    href: "/dashboard",
    title: "Dashboard",
    body: "Posts today, scheduled runs, awaiting approval, successes and failures. Upcoming Autopilot slots sit on the right.",
  },
  {
    href: "/autopilot",
    title: "Autopilot",
    body: "Topics, weekday, time, your voice. No nodes. Start Autopilot writes the workflow on the engine.",
  },
  {
    href: "/automation",
    title: "Automation",
    body: "Active or paused, next run, Run now. This is the operator console for LinkedIn Autopilot.",
  },
  {
    href: "/executions",
    title: "Executions",
    body: "Every run has an id. Open one and click Research / Write / Risk / Publish for input, output, tokens, time, and cost.",
  },
  {
    href: "/approvals",
    title: "Approvals",
    body: "High-risk posts wait here. The email link is signed and expires. Approve, reject, or edit.",
  },
  {
    href: "/workflows",
    title: "Advanced workflows",
    body: "Visual editor, JSON, AI builder, import/export. Same eight nodes. Same engine as Autopilot.",
  },
  {
    href: "/settings",
    title: "Settings",
    body: "OpenRouter key, LinkedIn OAuth, encrypted secrets. Default model is openrouter/free.",
  },
];

export default function TourPage() {
  return (
    <div className="grain min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-6">
        <BrandLogo />
        <Link href="/register" className="text-sm text-muted hover:text-ink">
          Create account
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-5 pb-20">
        <p className="text-sm uppercase tracking-[0.18em] text-muted">Production tour</p>
        <h1 className="display mt-2 text-5xl">Seven screens. One engine.</h1>
        <p className="mt-4 text-muted">
          Cheap default: OpenRouter free models (`openrouter/free`). Database: Supabase. Host: Vercel. Setup
          guide lives in the repo at docs/setup.md.
        </p>
        <ol className="mt-10 space-y-5">
          {stops.map((stop, index) => (
            <li key={stop.href} className="paper rounded-2xl border border-line p-5">
              <p className="text-xs text-muted">
                {index + 1} / {stops.length}
              </p>
              <h2 className="display mt-1 text-3xl">{stop.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{stop.body}</p>
              <Link href={stop.href} className="mt-3 inline-block text-sm underline">
                Open {stop.title}
              </Link>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
