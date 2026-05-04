import { useState } from "react";
import { NAV } from "../lib/nav";
import { Icon } from "./Icon";
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
};

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
  const [collapsed, setCollapsed] = useState(false);
  const credits = profile?.credits ?? 0;
  const tier = profile?.tier ?? "free";
  const capacity = tier === "free" ? 5000 : 50000;
  const pct = Math.min(100, (credits / capacity) * 100);
  const initial = (email || tier)[0]?.toUpperCase() ?? "U";
  const userName = email?.split("@")[0] || "Anônimo";

  return (
    <aside className={"sidebar" + (collapsed ? " collapsed" : "")}>
      <button
        className="sidebar-toggle"
        onClick={() => setCollapsed((v) => !v)}
        title={collapsed ? "Expandir menu" : "Recolher menu"}
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
      >
        <Icon d={collapsed ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6"} />
      </button>
      <div className="brand">
        <div className="brand-mark">R</div>
        <div className="brand-name">
          refine<span>.</span>
        </div>
        <div className="brand-status">
          <span className="dot-live"></span>online
        </div>
      </div>

      <button className="cta-new" onClick={() => onTabChange("home")}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon d="M12 5v14M5 12h14" />
          Nova criação
        </span>
        <span className="arrow">
          <Icon d="M5 12h14M13 5l7 7-7 7" />
        </span>
      </button>

      <nav className="nav">
        {NAV.map((g, gi) => {
          if (g.cap !== undefined && g.items) {
            return (
              <div key={gi}>
                {g.cap.trim() && <div className="nav-cap">{g.cap}</div>}
                {g.items.map((it) => (
                  <div
                    key={it.key}
                    className={"nav-item" + (it.key === currentTab ? " active" : "")}
                    onClick={() => onTabChange(it.key)}
                  >
                    <Icon d={it.ico} />
                    <span style={{ flex: 1 }}>{it.label}</span>
                    {it.pill && <span className={"pill " + (it.pillCls || "")}>{it.pill}</span>}
                  </div>
                ))}
              </div>
            );
          }
          return null;
        })}
      </nav>

      <div className="sidebar-foot">
        <div className="credits">
          <div className="credits-row">
            <span>Plano {tier.toUpperCase()}</span>
            <strong>
              {credits} / {capacity}
            </strong>
          </div>
          <div className="credits-bar">
            <i style={{ width: `${pct}%` }} />
          </div>
          <div
            className="credits-row"
            style={{ fontSize: 10.5, color: "var(--text-3)", marginTop: -2 }}
          >
            Renova em 30 dias
          </div>
          <button className="upgrade" style={{ marginTop: 10 }} onClick={onUpgrade}>
            Upgrade Pro
          </button>
        </div>
        {isAnonymous ? (
          <button
            onClick={onSignInGoogle}
            style={{
              marginTop: 8,
              width: "100%",
              padding: "10px",
              borderRadius: 12,
              border: "1px solid var(--hairline-2)",
              background: "rgba(255,255,255,.04)",
              color: "var(--text)",
              fontSize: 12.5,
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Entrar com Google
          </button>
        ) : null}
        <div
          className="user"
          onClick={isAnonymous ? undefined : onSignOut}
          style={{ cursor: isAnonymous ? "default" : "pointer" }}
          title={isAnonymous ? "" : "Clique pra sair"}
        >
          <div className="avatar">{initial}</div>
          <div className="user-meta">
            <strong>{userName}</strong>
            <span>{email || "Anônimo"}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
