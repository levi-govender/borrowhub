import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import { initials } from "../format";
import type { Me } from "../api";

export type Tab = "dashboard" | "inventory" | "bookings" | "calendar" | "audit";

const NAV: { id: Tab; label: string; icon: IconName }[] = [
  { id: "dashboard", label: "Dashboard", icon: "gauge" },
  { id: "inventory", label: "Inventory", icon: "grid" },
  { id: "bookings", label: "Bookings", icon: "inbox" },
  { id: "calendar", label: "Calendar", icon: "calendar" },
  { id: "audit", label: "Audit", icon: "shield" },
];

export function BrandMark({ size = 18 }: { size?: number }) {
  return (
    <span className="brand__mark" aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3.5 20 8v8l-8 4.5L4 16V8l8-4.5z" />
        <path d="M8.5 12.5h7m0 0-2.4-2.4m2.4 2.4-2.4 2.4" />
      </svg>
    </span>
  );
}

type Props = {
  tab: Tab;
  onTab: (tab: Tab) => void;
  me: Me | null;
  objectId: string;
  overdueCount: number | null;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onSignOut: () => void;
  title: string;
  subtitle: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

export function AppShell({
  tab,
  onTab,
  me,
  objectId,
  overdueCount,
  theme,
  onToggleTheme,
  onSignOut,
  title,
  subtitle,
  actions,
  children,
}: Props) {
  const displayName = me?.displayName ?? objectId;

  return (
    <div className="shell">
      <header className="rail">
        <div className="brand">
          <BrandMark />
          <span>
            <span className="brand__name">BorrowHub</span>
            <span className="brand__meta">Admin console</span>
          </span>
        </div>

        <nav className="nav" aria-label="Admin sections">
          <p className="rail__section">Workspace</p>
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className="nav__item"
              aria-current={tab === item.id ? "page" : undefined}
              onClick={() => onTab(item.id)}
            >
              <Icon name={item.icon} size={17} />
              <span>{item.label}</span>
              {item.id === "bookings" && overdueCount ? (
                <span className="nav__count nav__count--alert">{overdueCount}</span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="rail__foot">
          <div className="who">
            <span className="avatar" aria-hidden="true">
              {initials(displayName)}
            </span>
            <span className="who__body">
              <span className="who__name">{displayName}</span>
              <span className="who__role">{me?.role ?? "demo identity"}</span>
            </span>
          </div>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            <button
              type="button"
              className="btn btn--ghost btn--sm btn--icon"
              onClick={onToggleTheme}
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />
            </button>
            <button type="button" className="btn btn--sm rail__signout" onClick={onSignOut} aria-label="Sign out">
              <Icon name="logout" size={15} />
              <span className="btn__label">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="canvas">
        <div className="topbar">
          <div className="topbar__titles">
            <p className="eyebrow">BorrowHub · admin</p>
            <h1>{title}</h1>
            <div className="topbar__sub">{subtitle}</div>
          </div>
          {actions ? <div className="topbar__actions">{actions}</div> : null}
        </div>
        <main className="view">{children}</main>
      </div>
    </div>
  );
}
