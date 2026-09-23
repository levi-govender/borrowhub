import type { Booking } from "./api";

const REMINDER_RANK: Record<string, number> = {
  OVERDUE: 0,
  RETURN_NOW: 1,
  COLLECT_NOW: 2,
};

export function bookingsNeedingAttention(items: Booking[]): Booking[] {
  return items
    .filter((item) => (item.reminders?.length ?? 0) > 0)
    .slice()
    .sort((left, right) => rank(left) - rank(right) || left.startAt.localeCompare(right.startAt));
}

function rank(item: Booking): number {
  const kinds = item.reminders ?? [];
  if (kinds.includes("OVERDUE")) {
    return REMINDER_RANK.OVERDUE;
  }
  if (kinds.includes("RETURN_NOW")) {
    return REMINDER_RANK.RETURN_NOW;
  }
  if (kinds.includes("COLLECT_NOW")) {
    return REMINDER_RANK.COLLECT_NOW;
  }
  return 9;
}

const HOME_PAGE_SIZE = 100;

type HomeBookingSource = {
  listMine(params: { status?: string; page?: number; pageSize?: number }): Promise<{ items: Booking[]; total: number }>;
};

async function loadStatus(source: HomeBookingSource, status: "CHECKED_OUT" | "RESERVED"): Promise<Booking[]> {
  const first = await source.listMine({ status, page: 1, pageSize: HOME_PAGE_SIZE });
  const items = [...first.items];
  const pages = Math.ceil(first.total / HOME_PAGE_SIZE);
  for (let page = 2; page <= pages; page += 1) {
    const next = await source.listMine({ status, page, pageSize: HOME_PAGE_SIZE });
    items.push(...next.items);
  }
  return items;
}

/** Checked-out and reserved loans, so an older due item is not hidden behind newer history. */
export async function loadHomeBookings(source: HomeBookingSource): Promise<Booking[]> {
  const [checkedOut, reserved] = await Promise.all([
    loadStatus(source, "CHECKED_OUT"),
    loadStatus(source, "RESERVED"),
  ]);
  return [...checkedOut, ...reserved];
}

/** Next reserved window that is not already in the due-now list. */
export function nextUpcomingReservation(items: Booking[], now: number = Date.now()): Booking | null {
  const attentionIds = new Set(bookingsNeedingAttention(items).map((item) => item.id));
  const upcoming = items
    .filter((item) => item.status === "RESERVED" && !attentionIds.has(item.id))
    .filter((item) => new Date(item.endAt).getTime() > now)
    .sort((left, right) => left.startAt.localeCompare(right.startAt));
  return upcoming[0] ?? null;
}
