"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/autopilot", label: "Autopilot" },
  { href: "/automation", label: "Automation" },
  { href: "/workflows", label: "Workflows" },
  { href: "/executions", label: "Executions" },
  { href: "/approvals", label: "Approvals" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name?: string | null; email?: string | null; role?: string };
}) {
  const pathname = usePathname();
  return (
    <div className="grain min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line/80 bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/dashboard" className="display text-2xl tracking-tight">
            POSTARA
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm",
                  pathname === link.href || pathname.startsWith(`${link.href}/`)
                    ? "bg-ink text-bg-elevated"
                    : "text-muted hover:text-ink",
                )}
              >
                {link.label}
              </Link>
            ))}
            {user.role === "ADMIN" ? (
              <Link
                href="/admin"
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm",
                  pathname.startsWith("/admin") ? "bg-ink text-bg-elevated" : "text-muted hover:text-ink",
                )}
              >
                Admin
              </Link>
            ) : null}
          </nav>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-sm text-muted hover:text-ink"
          >
            {user.name ?? user.email}
          </button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
