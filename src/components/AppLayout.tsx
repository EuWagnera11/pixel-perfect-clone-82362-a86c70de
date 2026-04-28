import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Sparkles, LayoutTemplate, Image as ImageIcon, CreditCard, Settings, LogOut, Search, Bell } from "lucide-react";
import { CuboLogo } from "@/components/CuboLogo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/app", label: "Início", icon: LayoutDashboard, end: true },
  { to: "/app/suite", label: "Suite", icon: Sparkles, accent: true },
  { to: "/app/personas", label: "Personas", icon: Users },
  { to: "/app/generations", label: "Galeria", icon: ImageIcon },
  { to: "/app/templates", label: "Templates", icon: LayoutTemplate },
  { to: "/app/billing", label: "Plano", icon: CreditCard },
  { to: "/app/settings", label: "Ajustes", icon: Settings },
];

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ full_name?: string; tier?: string; credits?: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name, tier, credits").eq("id", user.id).maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [user]);

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  return (
    <div className="min-h-screen bg-surface">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-background lg:flex">
        <div className="flex h-16 items-center border-b border-border px-5">
          <CuboLogo />
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {nav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary-light text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                item.accent && !isActive && "text-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <div className="mb-2 flex items-center gap-3 rounded-md p-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-primary-light text-sm font-semibold text-primary">
              {profile?.full_name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{profile?.full_name ?? user?.email}</div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {profile?.tier ?? "free"}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="lg:pl-60">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-6 backdrop-blur-xl">
          <div className="flex flex-1 items-center gap-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Buscar templates, personas, gerações..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground md:inline">⌘K</kbd>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 sm:flex">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="font-mono text-xs">{profile?.credits ?? 0} créditos</span>
            </div>
            <Button variant="ghost" size="icon"><Bell className="h-4 w-4" /></Button>
          </div>
        </header>
        <main className="p-6 lg:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
