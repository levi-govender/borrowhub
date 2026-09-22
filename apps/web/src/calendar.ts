import type { BookingListItem } from "./api";

/** SAST has no daylight-saving shift. */
export const OFFICE_TIME_ZONE = "Africa/Johannesburg";
export const OFFICE_OFFSET = "+02:00";

export type OfficeDay = {
  start: string;
  end: string;
  weekday: string;
  dateLabel: string;
};

export type OfficeWeek = {
  from: string;
  to: string;
  label: string;
  days: OfficeDay[];
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function officeParts(instant: Date): { year: number; month: number; day: number; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: OFFICE_TIME_ZONE,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const weekdayName = read("weekday");
  const weekdayIndex: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  return {
    year: Number(read("year")),
    month: Number(read("month")),
    day: Number(read("day")),
    weekday: weekdayIndex[weekdayName] ?? 0,
  };
}

function officeMidnight(year: number, month: number, day: number): Date {
  return new Date(`${year}-${pad(month)}-${pad(day)}T00:00:00${OFFICE_OFFSET}`);
}

function addOfficeDays(year: number, month: number, day: number, delta: number): Date {
  const utcNoon = Date.UTC(year, month - 1, day + delta, 12, 0, 0);
  const shifted = officeParts(new Date(utcNoon));
  return officeMidnight(shifted.year, shifted.month, shifted.day);
}

function formatDayLabel(start: Date): { weekday: string; dateLabel: string } {
  const weekday = new Intl.DateTimeFormat("en-ZA", { timeZone: OFFICE_TIME_ZONE, weekday: "short" }).format(start);
  const dateLabel = new Intl.DateTimeFormat("en-ZA", {
    timeZone: OFFICE_TIME_ZONE,
    day: "numeric",
    month: "short",
  }).format(start);
  return { weekday, dateLabel };
}

export function officeWeek(anchor: Date = new Date()): OfficeWeek {
  const parts = officeParts(anchor);
  const monday = addOfficeDays(parts.year, parts.month, parts.day, -parts.weekday);
  const days: OfficeDay[] = [];
  for (let index = 0; index < 7; index += 1) {
    const mondayParts = officeParts(monday);
    const start = addOfficeDays(mondayParts.year, mondayParts.month, mondayParts.day, index);
    const end = addOfficeDays(mondayParts.year, mondayParts.month, mondayParts.day, index + 1);
    const labels = formatDayLabel(start);
    days.push({
      start: start.toISOString(),
      end: end.toISOString(),
      weekday: labels.weekday,
      dateLabel: labels.dateLabel,
    });
  }
  const from = days[0]?.start ?? monday.toISOString();
  const to = days[6]?.end ?? from;
  const label = `${days[0]?.dateLabel ?? ""} – ${days[6]?.dateLabel ?? ""}`;
  return { from, to, label, days };
}

export function shiftOfficeWeek(fromIso: string, weeks: number): OfficeWeek {
  const start = new Date(fromIso);
  start.setTime(start.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
  return officeWeek(start);
}

/** Half-open overlap: existing.start < dayEnd AND existing.end > dayStart. */
export function overlapsWindow(item: { startAt: string; endAt: string }, fromIso: string, toIso: string): boolean {
  const start = new Date(item.startAt).getTime();
  const end = new Date(item.endAt).getTime();
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  return start < to && end > from;
}

export function bookingsOnDay(items: BookingListItem[], day: OfficeDay): BookingListItem[] {
  return items
    .filter((item) => overlapsWindow(item, day.start, day.end))
    .sort((left, right) => left.startAt.localeCompare(right.startAt) || left.assetTag.localeCompare(right.assetTag));
}

export function isOpenLoan(item: BookingListItem): boolean {
  return item.status === "RESERVED" || item.status === "CHECKED_OUT";
}
