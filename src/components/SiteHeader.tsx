import { Link } from "react-router";
import type { ReactNode } from "react";

export function SiteHeader({ right }: { right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-2.5 font-serif text-lg font-semibold tracking-wide">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground ring-2 ring-gold/60 ring-offset-2 ring-offset-background">✈</span>
          Flight Price Notifier
        </Link>
        {right}
      </div>
    </header>
  );
}

export const btnPrimary =
  "inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-medium tracking-wide text-primary-foreground shadow-glow ring-1 ring-gold/40 transition hover:bg-primary/90 disabled:opacity-50";
export const btnGhost =
  "inline-flex items-center justify-center rounded-full border border-gold/50 px-5 py-2 text-sm font-medium tracking-wide text-foreground transition hover:bg-secondary";
