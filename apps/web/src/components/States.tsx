import type { ReactNode } from "react";
import { Icon } from "./Icon";

/** Skeleton table rows — announced once via a polite status message. */
export function LoadingRows({ label, rows = 5 }: { label: string; rows?: number }) {
  return (
    <div className="skelrows">
      <p role="status" className="vh">
        {label}
      </p>
      {Array.from({ length: rows }, (_, index) => (
        <div className="skelrow" key={index} aria-hidden="true">
          <div className="skel" style={{ width: "2rem", height: "2rem", borderRadius: "9px" }} />
          <div className="skel" style={{ width: `${34 + ((index * 13) % 26)}%`, height: "0.7rem" }} />
          <div className="skel" style={{ width: `${12 + ((index * 7) % 14)}%`, height: "0.7rem" }} />
          <div className="skel" style={{ width: "4.5rem", height: "1.2rem", borderRadius: "999px", marginLeft: "auto" }} />
        </div>
      ))}
    </div>
  );
}

export function LoadingTiles({ label, tiles = 4 }: { label: string; tiles?: number }) {
  return (
    <div className="grid-kpi">
      <p role="status" className="vh">
        {label}
      </p>
      {Array.from({ length: tiles }, (_, index) => (
        <div className="card" key={index} aria-hidden="true" style={{ padding: "1rem 1.05rem", gap: "0.7rem" }}>
          <div className="skel" style={{ width: "45%", height: "0.65rem" }} />
          <div className="skel" style={{ width: "3.5rem", height: "2rem" }} />
          <div className="skel" style={{ width: "60%", height: "0.6rem" }} />
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="alert" role="alert">
      <Icon name="alert" size={18} />
      <div className="alert__body">
        <p className="alert__msg">{message}</p>
        {onRetry ? (
          <button type="button" className="btn btn--sm" onClick={onRetry}>
            <Icon name="reset" size={14} />
            Retry
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function InlineError({ message }: { message: string }) {
  return (
    <div className="alert" role="alert">
      <Icon name="alert" size={18} />
      <div className="alert__body">
        <p className="alert__msg">{message}</p>
      </div>
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <svg
        className="empty__art"
        width="104"
        height="72"
        viewBox="0 0 104 72"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M14 26h76v34a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2V26z" strokeDasharray="4 5" />
        <path d="M14 26 24 10h56l10 16" />
        <path d="M14 26h22l4 8h24l4-8h22" />
        <circle cx="52" cy="46" r="7" strokeDasharray="3 4" />
      </svg>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}
