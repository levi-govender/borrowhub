import assert from "node:assert/strict";
import { test } from "node:test";
import type { Booking } from "./api.ts";
import { bookingsNeedingAttention, nextUpcomingReservation } from "./home.ts";

function booking(partial: Partial<Booking> & Pick<Booking, "id" | "status">): Booking {
  return {
    equipmentId: "eq",
    assetTag: partial.assetTag ?? partial.id,
    startAt: "2026-09-23T08:00:00Z",
    endAt: "2026-09-23T10:00:00Z",
    allowedActions: [],
    ...partial,
  };
}

test("bookingsNeedingAttention ranks overdue before collect", () => {
  const items = [
    booking({ id: "c", status: "RESERVED", reminders: ["COLLECT_NOW"] }),
    booking({ id: "o", status: "CHECKED_OUT", reminders: ["OVERDUE"] }),
    booking({ id: "quiet", status: "RESERVED" }),
  ];
  assert.deepEqual(
    bookingsNeedingAttention(items).map((item) => item.id),
    ["o", "c"],
  );
});

test("nextUpcomingReservation skips due-now loans", () => {
  const now = Date.parse("2026-09-22T12:00:00Z");
  const items = [
    booking({
      id: "due",
      status: "RESERVED",
      reminders: ["COLLECT_NOW"],
      startAt: "2026-09-22T11:50:00Z",
      endAt: "2026-09-22T14:00:00Z",
    }),
    booking({
      id: "later",
      status: "RESERVED",
      startAt: "2026-09-24T08:00:00Z",
      endAt: "2026-09-24T10:00:00Z",
    }),
  ];
  assert.equal(nextUpcomingReservation(items, now)?.id, "later");
});
