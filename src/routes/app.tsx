import { useNavigate } from "react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useHead } from "@/hooks/useHead";
import { SiteHeader, btnGhost, btnPrimary } from "@/components/SiteHeader";
import { PLANS, listSubscriptions, saveSubscription, type Subscription } from "@/lib/flightApi";

export function AppShell() {
  useHead({
    title: "Dashboard — Flight Price Notifier",
    description: "Your flight route tracking dashboard.",
  });
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/signin");
  }, [loading, user, navigate]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-brocade">
      <SiteHeader
        right={
          user && (
            <button onClick={signOut} className={btnGhost}>
              Sign out / 登出
            </button>
          )
        }
      />
      <main className="mx-auto max-w-3xl px-5 py-20">
        {user?.email && (
          <div className="animate-fade-up space-y-6">
            <div className="rounded-2xl border border-border bg-card p-8 shadow-silk backdrop-blur-sm">
              <h1 className="text-3xl font-semibold tracking-tight">Hi {user.email}</h1>
              <p className="mt-4 text-foreground">
                選一條航線、設定目標價（新台幣），票價達標時我們會寄信通知你。
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Pick a route and a TWD target price — we'll email you when the fare drops to it.
              </p>
            </div>
            <PlanCards email={user.email} />
          </div>
        )}
      </main>
    </div>
  );
}

function PlanCards({ email }: { email: string }) {
  const [subs, setSubs] = useState<Record<string, Subscription>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    listSubscriptions(email)
      .then((items) => setSubs(Object.fromEntries(items.map((s) => [s.route, s]))))
      .catch((e: Error) => setLoadError(e.message));
  }, [email]);

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {loadError && (
        <p className="text-sm text-destructive sm:col-span-2">
          無法載入訂閱 / Could not load subscriptions: {loadError}
        </p>
      )}
      {PLANS.map((plan) => (
        <PlanCard
          key={plan.route}
          email={email}
          plan={plan}
          sub={subs[plan.route]}
          onSaved={(s) => setSubs((prev) => ({ ...prev, [s.route]: s }))}
        />
      ))}
    </div>
  );
}

function PlanCard({
  email,
  plan,
  sub,
  onSaved,
}: {
  email: string;
  plan: (typeof PLANS)[number];
  sub: Subscription | undefined;
  onSaved: (s: Subscription) => void;
}) {
  const [target, setTarget] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const showForm = !sub || editing;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const price = Number(target);
    if (!Number.isFinite(price) || price <= 0) {
      setError("請輸入正確的金額 / Enter a valid amount");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveSubscription(email, plan.plan_name, price);
      const now = new Date().toISOString();
      onSaved({
        email,
        route: plan.route,
        plan_name: plan.plan_name,
        target_price: price,
        currency: "TWD",
        created_at: sub?.created_at ?? now,
        updated_at: now,
      });
      setEditing(false);
      setTarget("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-silk backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{plan.label}</h2>
          <p className="text-sm text-muted-foreground">{plan.en}</p>
        </div>
        {sub && (
          <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary ring-1 ring-primary/30">
            已訂閱 / Subscribed
          </span>
        )}
      </div>

      {sub && !editing && (
        <div className="mt-5 space-y-4">
          <p className="text-sm">
            目標價 / Target:{" "}
            <span className="font-semibold">NT${sub.target_price.toLocaleString()}</span>
          </p>
          <button className={btnGhost} onClick={() => setEditing(true)}>
            更新目標價 / Update
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <label className="block space-y-1.5 text-sm">
            <span className="text-muted-foreground">目標價（新台幣）/ Target price (TWD)</span>
            <input
              className={input}
              type="number"
              min={1}
              step={1}
              required
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={String(sub?.target_price ?? Math.round(plan.hint * 1.1))}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            目前最低價約 NT${plan.hint.toLocaleString()} / Recent cheapest ≈ NT$
            {plan.hint.toLocaleString()}
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? "儲存中… / Saving…" : sub ? "儲存 / Save" : "開始追蹤 / Track"}
            </button>
            {sub && (
              <button type="button" className={btnGhost} onClick={() => setEditing(false)}>
                取消 / Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}

const input =
  "w-full rounded-lg border border-input bg-background/80 px-3 py-2.5 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30";
