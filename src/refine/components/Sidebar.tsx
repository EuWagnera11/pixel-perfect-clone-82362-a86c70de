import { NAV } from "../lib/nav";
import { Icon } from "./Icon";
import type { Profile } from "../hooks/useAuth";

type SidebarProps = {
  currentTab: string;
  onTabChange: (key: string) => void;
  profile: Profile | null;
  email: string | null;
};

export function Sidebar({ currentTab, onTabChange, profile, email }: SidebarProps) {
  const credits = profile?.credits ?? 0;
  const tier = profile?.tier ?? "free";
  // Capacity bar — assume 5000 = 100% pra free
  const capacity = tier === "free" ? 5000 : 50000;
  const pct = Math.min(100, (credits / capacity) * 100);
  const initial = (email || tier)[0]?.toUpperCase() ?? "U";
  const userName = email?.split("@")[0] || "Anônimo";

  return (
    <aside className="sidebar">
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
          <button className="upgrade" style={{ marginTop: 10 }}>
            Upgrade Pro
          </button>
        </div>
        <div className="user">
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
