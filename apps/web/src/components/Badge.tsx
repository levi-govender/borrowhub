import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import { humanize } from "../format";
import type { BookingStatus, OperationalStatus } from "../api";

type Tone = "good" | "warning" | "serious" | "critical" | "info" | "neutral" | "plain";

type BadgeProps = {
  tone?: Tone;
  icon?: IconName;
  children: ReactNode;
};

/** Status is never colour alone: every badge carries an icon and a text label. */
export function Badge({ tone = "neutral", icon, children }: BadgeProps) {
  return (
    <span className={`badge badge--${tone}`}>
      {icon ? <Icon name={icon} size={13} /> : null}
      {children}
    </span>
  );
}

const BOOKING_TONES: Record<BookingStatus, { tone: Tone; icon: IconName }> = {
  RESERVED: { tone: "info", icon: "calendar" },
  CHECKED_OUT: { tone: "warning", icon: "clock" },
  RETURNED: { tone: "good", icon: "check" },
  CANCELLED: { tone: "neutral", icon: "close" },
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const style = BOOKING_TONES[status] ?? { tone: "neutral" as Tone, icon: "info" as IconName };
  return (
    <Badge tone={style.tone} icon={style.icon}>
      {humanize(status)}
    </Badge>
  );
}

const ASSET_TONES: Record<OperationalStatus, { tone: Tone; icon: IconName }> = {
  ACTIVE: { tone: "good", icon: "check" },
  MAINTENANCE: { tone: "serious", icon: "bolt" },
  ARCHIVED: { tone: "neutral", icon: "box" },
};

export function AssetStatusBadge({ status }: { status: OperationalStatus }) {
  const style = ASSET_TONES[status] ?? { tone: "neutral" as Tone, icon: "info" as IconName };
  return (
    <Badge tone={style.tone} icon={style.icon}>
      {humanize(status)}
    </Badge>
  );
}

export function OverdueBadge({ label = "Overdue" }: { label?: string }) {
  return (
    <Badge tone="critical" icon="alert">
      {label}
    </Badge>
  );
}
