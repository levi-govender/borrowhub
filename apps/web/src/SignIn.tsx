import { useState } from "react";
import { BrandMark } from "./components/AppShell";
import { Icon } from "./components/Icon";
import type { DemoIdentity } from "./api";

type Props = {
  onContinue: (identity: DemoIdentity) => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
};

const POINTS = [
  "One reservation per physical asset — never a pooled quantity.",
  "Collections, returns and overdue loans in a single queue.",
  "Every action written to an audit trail with a trace id.",
];

export function SignIn({ onContinue, theme, onToggleTheme }: Props) {
  const [objectId, setObjectId] = useState("admin-1");
  const [role, setRole] = useState<"ADMIN" | "EMPLOYEE">("ADMIN");

  return (
    <div className="auth">
      <section className="auth__pitch">
        <div className="brand">
          <BrandMark />
          <span>
            <span className="brand__name">BorrowHub</span>
            <span className="brand__meta">Admin console</span>
          </span>
        </div>

        <h2 className="auth__headline">Every adapter, monitor and test phone, accounted for.</h2>
        <p className="auth__lede">
          The office side of BorrowHub: manage the asset catalogue, watch reservations turn into loans, and chase what is
          late — in office time.
        </p>

        <div className="auth__points">
          {POINTS.map((point) => (
            <p className="auth__point" key={point}>
              <Icon name="check" size={15} />
              {point}
            </p>
          ))}
        </div>
      </section>

      <div className="auth__panel">
        <div className="auth__card">
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
            <div>
              <p className="eyebrow">BorrowHub · admin</p>
              <h1 style={{ marginTop: "0.35rem" }}>Sign in</h1>
            </div>
            <button
              type="button"
              className="btn btn--ghost btn--sm btn--icon"
              style={{ marginLeft: "auto" }}
              onClick={onToggleTheme}
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />
            </button>
          </div>

          <p className="auth__note">
            Local demo identity. Microsoft Entra PKCE stays disabled until an Entra tenant exists (<code>P0-01</code>).
          </p>

          <form
            className="auth__form"
            onSubmit={(event) => {
              event.preventDefault();
              const next = objectId.trim();
              if (next.length === 0) {
                return;
              }
              onContinue({ objectId: next, role });
            }}
          >
            <label className="field">
              Demo object id
              <input
                name="objectId"
                value={objectId}
                onChange={(event) => setObjectId(event.target.value)}
                autoComplete="username"
                required
              />
            </label>

            <fieldset className="segmented">
              <legend>Role</legend>
              <label className="segmented__option">
                <input type="radio" name="role" checked={role === "ADMIN"} onChange={() => setRole("ADMIN")} />
                Admin
              </label>
              <label className="segmented__option">
                <input type="radio" name="role" checked={role === "EMPLOYEE"} onChange={() => setRole("EMPLOYEE")} />
                Employee
              </label>
              <p className="segmented__hint">
                {role === "ADMIN"
                  ? "Full access to inventory and the booking queue."
                  : "Admin APIs answer 403 — the console stays read-only."}
              </p>
            </fieldset>

            <button type="submit" className="btn btn--primary" style={{ minHeight: "2.6rem" }}>
              Continue
              <Icon name="arrowRight" size={15} />
            </button>
          </form>

          <p className="auth__note" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Icon name="shield" size={14} />
            Requests carry <code>X-Demo-Object-Id</code> to the BFF.
          </p>
        </div>
      </div>
    </div>
  );
}
