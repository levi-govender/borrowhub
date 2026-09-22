import assert from "node:assert/strict";
import { test } from "node:test";
import { bookingsOnDay, officeWeek, overlapsWindow, shiftOfficeWeek } from "./calendar.ts";
import type { BookingListItem } from "./api.ts";

test("officeWeek is Monday–Sunday in Africa/Johannesburg", () => {
  const week = officeWeek(new Date("2026-09-23T08:00:00+02:00"));
  assert.equal(week.from, new Date("2026-09-21T00:00:00+02:00").toISOString());
  assert.equal(week.to, new Date("2026-09-28T00:00:00+02:00").toISOString());
  assert.equal(week.days.length, 7);
  assert.equal(week.days[0]?.weekday, "Mon");
  assert.equal(week.days[6]?.weekday, "Sun");
});

test("shiftOfficeWeek moves by seven office days", () => {
  const next = shiftOfficeWeek(new Date("2026-09-21T00:00:00+02:00").toISOString(), 1);
  assert.equal(next.from, new Date("2026-09-28T00:00:00+02:00").toISOString());
});

test("overlapsWindow uses half-open intervals", () => {
  const item = { startAt: "2026-09-21T10:00:00Z", endAt: "2026-09-21T12:00:00Z" };
  assert.equal(overlapsWindow(item, "2026-09-21T12:00:00Z", "2026-09-21T18:00:00Z"), false);
  assert.equal(overlapsWindow(item, "2026-09-21T08:00:00Z", "2026-09-21T10:00:00Z"), false);
  assert.equal(overlapsWindow(item, "2026-09-21T11:00:00Z", "2026-09-21T13:00:00Z"), true);
});

test("bookingsOnDay groups loans that touch that office day", () => {
  const week = officeWeek(new Date("2026-09-21T12:00:00+02:00"));
  const items: BookingListItem[] = [
    {
      id: "a",
      assetTag: "PHONE-001",
      equipmentName: "Pixel",
      borrower: "Ada",
      startAt: "2026-09-21T08:00:00Z",
      endAt: "2026-09-21T10:00:00Z",
      status: "RESERVED",
      overdue: false,
    },
    {
      id: "b",
      assetTag: "CAM-001",
      equipmentName: "Camera",
      borrower: "Lin",
      startAt: "2026-09-22T08:00:00Z",
      endAt: "2026-09-22T10:00:00Z",
      status: "CHECKED_OUT",
      overdue: false,
    },
  ];
  assert.equal(bookingsOnDay(items, week.days[0]!).map((item) => item.id).join(), "a");
  assert.equal(bookingsOnDay(items, week.days[1]!).map((item) => item.id).join(), "b");
});
