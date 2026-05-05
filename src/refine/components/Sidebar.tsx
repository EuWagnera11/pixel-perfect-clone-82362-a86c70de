import { useEffect, useState } from "react";
import { Plus, ArrowRight, Lock } from "@phosphor-icons/react";
import { NAV } from "../lib/nav";
import type { Profile } from "../hooks/useAuth";

type SidebarProps = {
  currentTab: string;
  onTabChange: (key: string) => void;
  profile: Profile | null;
  email: string | null;
  isAnonymous: boolean;
  onUpgrade: () => void;
  onSignInGoogle: () => void;
  onSignOut: () => void;
  activeJobsCount?: number;
};

const LS_KEY = "sidebar-locked";

export function Sidebar({
  currentTab,
  onTabChange,
  profile,
  email,
  isAnonymous,
  onUpgrade,
  onSignInGoogle,
  onSignOut,
}: SidebarProps) {
  const [locked, setLocked] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(LS_KEY) === "true";
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, String(locked));
  }, [locked]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setLocked((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const credits = profile?.credits ?? 0;
  const tier = profile?.tier ?? "free";
  const capacity = tier === "free" ? 5000 : 50000;
  const pct = Math.min(100, (credits / capacity) * 100);
  const initial = (email || tier)[0]?.toUpperCase() ?? "U";
  const userName = email?.split("@")[0] || "Anônimo";

  return (
    <aside className={"sidebar-v2" + (locked ? " locked" : "")}>
      <div className="sb-header">
        <button
          className="sb-brand"
          onClick={() => setLocked((v) => !v)}
          title={locked ? "Destravar (Cmd/Ctrl+B)" : "Travar (Cmd/Ctrl+B)"}
          aria-label="Toggle sidebar"
        >
          <span className="sb-brand-mark">
            R
            <span className="sb-brand-lock"><Lock size={10} weight="fill" /></span>
          </span>
          <span className="sb-brand-info">
            <span className="sb-brand-name">refine<span className="sb-brand-dot">.</span></span>
            <span className="sb-brand-status"><span className="sb-status-dot" />online</span>
          </span>
        </button>

        <button className="sb-cta" onClick={() => onTabChange("home")}>
          <span className="sb-cta-icon"><Plus size={14} weight="bold" /></span>
          <span className="sb-cta-label">Nova criação</span>
          <span className="sb-cta-arrow"><ArrowRight size={12} weight="bold" /></span>
        </button>
      </div>

      <nav className="sb-nav">
        {NAV.map((g, gi) => (
          <div className="sb-nav-section" key={gi}>
            {g.cap && g.cap.trim() && <div className="sb-nav-cap">{g.cap}</div>}
            {g.items?.map((it) => {
              const ItemIcon = it.IconComp;
              const active = it.key === currentTab;
              return (
                <button
                  key={it.key}
                  className={"sb-nav-item" + (active ? " active" : "")}
                  onClick={() => onTabChange(it.key)}
                >
                  <span className="sb-nav-icon"><ItemIcon size={18} weight="fill" /></span>
                  <span className="sb-nav-label">{it.label}</span>
                  {it.pill && <span className={"sb-nav-pill " + (it.pillCls || "")}>{it.pill}</span>}
                  <span className="sb-nav-tooltip">{it.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sb-foot">
        <div className="sb-credits">
          <div className="sb-credits-head">
            <span className="sb-credits-plan">Plano {tier.toUpperCase()}</span>
            <span className="sb-credits-count">
              <span className="current">{credits}</span>
              <span className="separator">/</span>
              <span className="max">{capacity}</span>
            </span>
          </div>
          <div className="sb-credits-bar"><i style={{ width: `${pct}%` }} /></div>
          <span className="sb-credits-renewal">Renova em 30 dias</span>
          <button className="sb-upgrade" onClick={onUpgrade}>Upgrade Pro</button>
        </div>

        <button className="sb-credits-mini" onClick={onUpgrade} title={`Créditos: ${credits}/${capacity}`}>
          <span className="sb-credits-mini-text">{Math.round(pct)}%</span>
          <span className="sb-credits-mini-bar" style={{ width: `${pct}%` }} />
        </button>

        {isAnonymous ? (
          <button className="sb-google" onClick={onSignInGoogle}>
            <svg width="14" height="14" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            <span className="sb-nav-label">Entrar com Google</span>
          </button>
        ) : null}

        <button
          className="sb-profile"
          onClick={isAnonymous ? undefined : onSignOut}
          title={isAnonymous ? "" : "Clique pra sair"}
        >
          <span className="sb-avatar">{initial}</span>
          <span className="sb-profile-info">
            <span className="sb-profile-name">{userName}</span>
            <span className="sb-profile-email">{email || "Anônimo"}</span>
          </span>
        </button>
      </div>
    </aside>
  );
}
