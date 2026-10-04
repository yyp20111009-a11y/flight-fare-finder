import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader, btnPrimary } from "./SiteHeader";

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isSignUp = mode === "signup";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = isSignUp
      ? await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/app` },
        })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setError(error.message);
    navigate({ to: "/app" });
  }

  const input =
    "w-full rounded-lg border border-input bg-secondary px-3 py-2.5 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30";

  return (
    <div className="min-h-screen bg-glow">
      <SiteHeader />
      <main className="mx-auto flex max-w-md flex-col px-5 py-16 animate-fade-up">
        <h1 className="text-3xl font-semibold tracking-tight">
          {isSignUp ? "Create account / 註冊" : "Sign in / 登入"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isSignUp ? "Start watching fares in seconds." : "Welcome back."}
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-6">
          <label className="block space-y-1.5 text-sm">
            <span className="text-muted-foreground">Email</span>
            <input className={input} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="text-muted-foreground">Password</span>
            <input className={input} type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>
            {busy ? "…" : isSignUp ? "Sign up / 註冊" : "Sign in / 登入"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isSignUp ? "Already have an account? " : "No account yet? "}
          <Link to={isSignUp ? "/signin" : "/signup"} className="text-accent hover:underline">
            {isSignUp ? "Sign in" : "Sign up"}
          </Link>
        </p>
      </main>
    </div>
  );
}
