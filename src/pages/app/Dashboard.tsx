import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Users, Image as ImageIcon, TrendingUp, ArrowRight, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Stats = { personas: number; generations: number; thisMonth: number; credits: number };

export default function Dashboard() {
  const { user } = useAuth();
  const [name, setName] = useState<string>("");
  const [stats, setStats] = useState<Stats>({ personas: 0, generations: 0, thisMonth: 0, credits: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: profile }, { count: personasCount }, { count: gensCount }] = await Promise.all([
        supabase.from("profiles").select("full_name, credits").eq("id", user.id).maybeSingle(),
        supabase.from("personas").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("generations").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      setName(profile?.full_name?.split(" ")[0] ?? "Criador");
      setStats({
        personas: personasCount ?? 0,
        generations: gensCount ?? 0,
        thisMonth: gensCount ?? 0,
        credits: profile?.credits ?? 0,
      });
    })();
  }, [user]);

  const cards = [
    { label: "Personas", value: stats.personas, icon: Users },
    { label: "Gerações totais", value: stats.generations, icon: ImageIcon },
    { label: "Este mês", value: stats.thisMonth, icon: TrendingUp },
    { label: "Créditos", value: stats.credits, icon: Sparkles, accent: true },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-10 animate-fade-in">
      {/* Hero card */}
      <div className="gradient-warm relative overflow-hidden rounded-2xl border border-border p-8 lg:p-10">
        <div className="max-w-2xl">
          <div className="mb-3 font-mono text-xs uppercase tracking-wider text-primary">Studio</div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Bem-vindo, {name}.
          </h1>
          <p className="mt-2 text-muted-foreground">
            Você tem <span className="font-mono font-semibold text-foreground">{stats.credits} créditos</span> disponíveis. Vamos criar algo editorial?
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" variant="hero" asChild>
              <Link to="/app/generate">Gerar agora <ArrowRight /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/app/personas">Minhas personas</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(c => (
          <div key={c.label} className={`rounded-xl border p-5 ${c.accent ? "border-primary/30 bg-primary-light/40" : "border-border bg-background"}`}>
            <div className="flex items-center justify-between">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{c.label}</div>
              <c.icon className={`h-4 w-4 ${c.accent ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div className="mt-3 text-3xl font-semibold tracking-tight">{c.value}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        {[
          { title: "Criar persona", desc: "Suba 1-3 fotos. Gere o grid canônico.", to: "/app/personas", icon: Users },
          { title: "Explorar templates", desc: "25+ cenas curadas, prontas pra usar.", to: "/app/templates", icon: LayoutTemplateIcon() },
          { title: "Comprar créditos", desc: "Faça upgrade ou recarregue seu saldo.", to: "/app/billing", icon: Sparkles },
        ].map((q, i) => (
          <Link key={i} to={q.to} className="group rounded-xl border border-border bg-background p-6 transition-all hover:border-foreground/20 hover:shadow-elegant">
            <div className="mb-4 grid h-10 w-10 place-items-center rounded-md bg-primary-light text-primary">
              {typeof q.icon === "function" ? null : <q.icon className="h-5 w-5" />}
              {typeof q.icon === "function" ? <Plus className="h-5 w-5" /> : null}
            </div>
            <div className="text-base font-semibold">{q.title}</div>
            <p className="mt-1 text-sm text-muted-foreground">{q.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function LayoutTemplateIcon() { return () => null; }
