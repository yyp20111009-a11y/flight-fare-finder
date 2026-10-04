import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function SiteHeader({ right }: { right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">✈</span>
          Flight Price Notifier
        </Link>
        {right}
      </div>
    </header>
  );
}

export const btnPrimary =
  "inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-glow transition hover:opacity-90 disabled:opacity-50";
export const btnGhost =
  "inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary";
