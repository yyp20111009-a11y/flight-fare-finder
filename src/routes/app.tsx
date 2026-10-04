import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader, btnGhost } from "@/components/SiteHeader";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Dashboard — Flight Price Notifier" },
      { name: "description", content: "Your flight route tracking dashboard." },
      { property: "og:title", content: "Dashboard — Flight Price Notifier" },
      { property: "og:description", content: "Your flight route tracking dashboard." },
    ],
  }),
  component: AppShell,
});

function AppShell() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/signin" });
  }, [loading, user, navigate]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-glow">
      <SiteHeader right={user && <button onClick={signOut} className={btnGhost}>Sign out / 登出</button>} />
      <main className="mx-auto max-w-3xl px-5 py-20">
        {user && (
          <div className="animate-fade-up rounded-2xl border border-border bg-card p-8">
            <h1 className="text-3xl font-semibold tracking-tight">Hi {user.email}</h1>
            <p className="mt-4 text-foreground">你的航線追蹤儀表板即將上線 — 下一個里程碑會加上訂閱航線的功能。</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Your dashboard is coming soon. Route-subscription will be added in the next milestone.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
