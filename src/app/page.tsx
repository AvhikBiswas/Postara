import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { auth } from "@/lib/auth";

const steps = [
  "Schedule",
  "Topic",
  "Research",
  "Write",
  "Risk check",
  "Approve if needed",
  "LinkedIn",
];

export default async function HomePage() {
  const session = await auth();
  return (
    <div className="grain min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <BrandLogo size={40} />
        <div className="flex items-center gap-3">
          <Link href={session ? "/dashboard" : "/login"} className="text-sm text-muted hover:text-ink">
            {session ? "Dashboard" : "Sign in"}
          </Link>
          <Link
            href={session ? "/autopilot" : "/register"}
            className="rounded-full bg-ink px-4 py-2 text-sm text-bg-elevated"
          >
            {session ? "Start Autopilot" : "Get started"}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-24">
        <section className="grid items-center gap-12 py-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="mb-4 text-sm uppercase tracking-[0.2em] text-muted">Open-source AI automation</p>
            <h1 className="display max-w-xl text-6xl leading-[0.95] text-ink md:text-7xl">
              Tell it what to post. It handles the rest.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-muted">
              Postara researches, writes, checks risk, asks for approval when necessary, and publishes to LinkedIn.
              You never have to think about nodes unless you want to.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="rounded-full bg-accent px-6 py-3 text-sm text-accent-ink">
                Start Autopilot
              </Link>
              <Link href="/tour" className="rounded-full border border-line bg-bg-elevated px-6 py-3 text-sm">
                Product tour
              </Link>
            </div>
          </div>
          <div className="paper rounded-3xl border border-line p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">The V1 workflow</p>
            <ol className="mt-5 space-y-3">
              {steps.map((step, index) => (
                <li key={step} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-xs text-bg-elevated">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          {[
            ["Simple mode", "A single screen: topics, cadence, your voice. Autopilot creates the workflow internally."],
            ["Human approval", "High-risk posts pause. A signed, expiring email link lets you approve, edit, or reject."],
            ["One engine", "LinkedIn, LLM, email, and HTTP are just nodes. The same engine will run every future workflow."],
          ].map(([title, copy]) => (
            <article key={title} className="paper rounded-2xl border border-line p-6">
              <h2 className="display text-3xl">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">{copy}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
