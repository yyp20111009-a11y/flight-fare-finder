import { Link } from "react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SiteHeader, btnPrimary } from "@/components/SiteHeader";
import { useHead } from "@/hooks/useHead";

const features = [
  { icon: "◎", title: "盯緊熱門航線 (Always-on route watching)", body: "持續監控台北出發的熱門航線（東京、首爾），自動抓最低票價。" },
  { icon: "✉", title: "達標自動通知 (Target-price email alerts)", body: "低於你設定的目標價，就寄 email 提醒你，附上立即訂購連結。" },
  { icon: "↺", title: "隨時取消 (Cancel anytime)", body: "月訂閱制，不想用隨時停，沒有綁約。" },
];

function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e?.isIntersecting && setVisible(true), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} data-visible={visible} className="reveal h-full" style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

export function Index() {
  useHead({
    title: "Flight Price Notifier — 機票降價通知",
    description: "Set a route and a target price — we email you when the fare drops.",
  });
  return (
    <div className="min-h-screen bg-glow">
      <SiteHeader right={<Link to="/signin" className={btnPrimary}>Sign in / 登入</Link>} />
      <main>
        <section className="mx-auto max-w-4xl px-5 pb-20 pt-24 text-center md:pt-32">
          <p className="animate-fade-up text-sm font-medium uppercase tracking-[0.2em] text-accent">機票降價通知</p>
          <h1 className="animate-fade-up mt-4 text-5xl font-bold tracking-tight text-gradient md:text-7xl">
            Flight Price Notifier
          </h1>
          <p className="animate-fade-up mt-6 text-xl font-medium md:text-2xl">設定航線與目標價，機票降價就通知你</p>
          <p className="animate-fade-up mt-3 text-muted-foreground">
            Set a route and a target price — we email you when the fare drops.
          </p>
          <div className="animate-fade-up mt-10">
            <Link to="/signup" className={`${btnPrimary} px-6 py-3 text-base`}>Get started / 開始使用</Link>
          </div>
        </section>
        <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-28 md:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 120}>
              <article className="h-full rounded-2xl border border-border bg-card p-7 transition hover:border-primary/50">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-xl text-accent">{f.icon}</div>
                <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </article>
            </Reveal>
          ))}
        </section>
      </main>
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © 2026 Flight Price Notifier
      </footer>
    </div>
  );
}
