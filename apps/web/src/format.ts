const OFFICE_TIME_ZONE = "Africa/Johannesburg";

/** Office-timezone timestamp, matching what the employee app shows. */
export function formatInstant(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-ZA", {
    timeZone: OFFICE_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/** Split date and time so a table column can stack them. */
export function formatDateParts(value: string): { date: string; time: string } {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { date: value, time: "" };
  }
  return {
    date: new Intl.DateTimeFormat("en-ZA", { timeZone: OFFICE_TIME_ZONE, dateStyle: "medium" }).format(date),
    time: new Intl.DateTimeFormat("en-ZA", { timeZone: OFFICE_TIME_ZONE, timeStyle: "short" }).format(date),
  };
}

/** `CHECKED_OUT` -> `Checked out`, `phone` -> `Phone`. */
export function humanize(value: string): string {
  const spaced = value.replace(/_/g, " ").toLowerCase().trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** How late a loan is, relative to now, for the overdue queue. */
export function formatLateness(endAt: string, now: number = Date.now()): string {
  const end = new Date(endAt).getTime();
  if (Number.isNaN(end) || end >= now) {
    return "";
  }
  const minutes = Math.floor((now - end) / 60_000);
  if (minutes < 60) {
    return `${minutes}m late`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    return `${hours}h late`;
  }
  return `${Math.floor(hours / 24)}d late`;
}

export function initials(name: string): string {
  const parts = name.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  const first = parts[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1] ?? "") : "";
  return `${first.charAt(0)}${last.charAt(0)}` || first.charAt(0);
}
