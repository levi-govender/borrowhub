import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CatalogueApiError,
  createCatalogueApi,
  defaultAvailabilityWindow,
  formatOfficeWindow,
  isBookable,
  parseEquipmentQr,
  parseOfficeLocal,
  toOfficeLocalInput,
  validateReservationWindow,
  formatBookingReminder,
  resolveBffBaseUrl,
} from "./api.ts";

test("resolveBffBaseUrl prefers env then android emulator loopback", () => {
  assert.equal(resolveBffBaseUrl({ EXPO_PUBLIC_BFF_BASE_URL: "http://10.0.0.5:3000/" }, "android"), "http://10.0.0.5:3000");
  assert.equal(
    resolveBffBaseUrl({ EXPO_PUBLIC_BFF_BASE_URL: "https://borrowhub-bff.example.azurecontainerapps.io/" }, "ios"),
    "https://borrowhub-bff.example.azurecontainerapps.io",
  );
  assert.equal(resolveBffBaseUrl({}, "android"), "http://10.0.2.2:3000");
  assert.equal(resolveBffBaseUrl({}, "ios"), "http://localhost:3000");
});

test("list builds BFF query string", async () => {
  const api = createCatalogueApi("http://bff.test", async (input) => {
    assert.equal(String(input), "http://bff.test/api/v1/equipment?query=pixel&category=phone");
    return new Response(JSON.stringify({ items: [], page: 1, pageSize: 20, total: 0 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  const page = await api.list({ query: "pixel", category: "phone" });
  assert.equal(page.total, 0);
});

test("maps BFF 404", async () => {
  const api = createCatalogueApi("http://bff.test", async () => {
    return new Response(JSON.stringify({ code: "NOT_FOUND", message: "Equipment was not found.", traceId: "t-404" }), {
      status: 404,
    });
  });
  await assert.rejects(() => api.get("11111111-1111-4111-8111-111111111111"), (error: unknown) => {
    assert.ok(error instanceof CatalogueApiError);
    assert.equal(error.status, 404);
    assert.equal(error.code, "NOT_FOUND");
    assert.equal(error.traceId, "t-404");
    assert.match(error.message, /NOT_FOUND/);
    return true;
  });
});

test("me sends demo object id", async () => {
  const api = createCatalogueApi("http://bff.test", async (input, init) => {
    assert.equal(String(input), "http://bff.test/api/v1/me");
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("x-demo-object-id"), "employee-a");
    return new Response(JSON.stringify({ displayName: "employee-a", role: "EMPLOYEE", objectId: "employee-a" }), {
      status: 200,
    });
  }, { objectId: "employee-a" });
  const me = await api.me();
  assert.equal(me.role, "EMPLOYEE");
});

test("createBooking posts idempotency key and body", async () => {
  const equipmentId = "11111111-1111-4111-8111-111111111111";
  const api = createCatalogueApi(
    "http://bff.test",
    async (input, init) => {
      assert.equal(String(input), "http://bff.test/api/v1/bookings");
      assert.equal(init?.method, "POST");
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("x-demo-object-id"), "employee-a");
      assert.equal(headers.get("idempotency-key"), "33333333-3333-4333-8333-333333333333");
      assert.equal(
        init?.body,
        JSON.stringify({
          equipmentId,
          startAt: "2026-09-22T07:00:00.000Z",
          endAt: "2026-09-22T10:00:00.000Z",
        }),
      );
      return new Response(JSON.stringify({ id: "b1", status: "RESERVED", equipmentId }), { status: 201 });
    },
    { objectId: "employee-a" },
  );
  const booking = await api.createBooking(
    { equipmentId, startAt: "2026-09-22T07:00:00.000Z", endAt: "2026-09-22T10:00:00.000Z" },
    "33333333-3333-4333-8333-333333333333",
  );
  assert.equal(booking.status, "RESERVED");
});

test("listMine and cancelBooking call BFF with identity and idempotency key", async () => {
  const bookingId = "22222222-2222-4222-8222-222222222222";
  const api = createCatalogueApi(
    "http://bff.test",
    async (input, init) => {
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("x-demo-object-id"), "employee-a");
      if (String(input) === "http://bff.test/api/v1/bookings?page=1&pageSize=20") {
        assert.equal(init?.method ?? "GET", "GET");
        return new Response(
          JSON.stringify({
            items: [{ id: bookingId, status: "RESERVED", assetTag: "PHONE-001", allowedActions: ["CANCEL"] }],
            page: 1,
            pageSize: 20,
            total: 1,
          }),
          { status: 200 },
        );
      }
      assert.equal(String(input), `http://bff.test/api/v1/bookings/${bookingId}/cancel`);
      assert.equal(init?.method, "POST");
      assert.equal(headers.get("idempotency-key"), "44444444-4444-4444-8444-444444444444");
      return new Response(JSON.stringify({ id: bookingId, status: "CANCELLED", allowedActions: [] }), { status: 200 });
    },
    { objectId: "employee-a" },
  );
  const page = await api.listMine({ page: 1, pageSize: 20 });
  assert.equal(page.total, 1);
  const cancelled = await api.cancelBooking(bookingId, "44444444-4444-4444-8444-444444444444");
  assert.equal(cancelled.status, "CANCELLED");
});

test("collectBooking and returnBooking post idempotency key", async () => {
  const bookingId = "55555555-5555-4555-8555-555555555555";
  const api = createCatalogueApi(
    "http://bff.test",
    async (input, init) => {
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("x-demo-object-id"), "employee-a");
      assert.equal(init?.method, "POST");
      if (String(input).endsWith("/collect")) {
        assert.equal(headers.get("idempotency-key"), "66666666-6666-4666-8666-666666666666");
        return new Response(JSON.stringify({ id: bookingId, status: "CHECKED_OUT", allowedActions: ["RETURN"] }), {
          status: 200,
        });
      }
      assert.equal(String(input), `http://bff.test/api/v1/bookings/${bookingId}/return`);
      assert.equal(headers.get("idempotency-key"), "77777777-7777-4777-8777-777777777777");
      assert.equal(init?.body, JSON.stringify({ damageNote: "cracked screen" }));
      return new Response(JSON.stringify({ id: bookingId, status: "RETURNED", allowedActions: [], damageNote: "cracked screen" }), { status: 200 });
    },
    { objectId: "employee-a" },
  );
  const collected = await api.collectBooking(bookingId, "66666666-6666-4666-8666-666666666666");
  assert.equal(collected.status, "CHECKED_OUT");
  const returned = await api.returnBooking(bookingId, "77777777-7777-4777-8777-777777777777", "cracked screen");
  assert.equal(returned.status, "RETURNED");
  assert.equal(returned.damageNote, "cracked screen");
});

test("default availability window is 3 hours from tomorrow 07:00 UTC", () => {
  const window = defaultAvailabilityWindow(new Date("2026-09-21T15:00:00Z"));
  assert.equal(window.startAt, "2026-09-22T07:00:00.000Z");
  assert.equal(window.endAt, "2026-09-22T10:00:00.000Z");
  assert.equal(formatOfficeWindow(window.startAt, window.endAt), "Tue, 22 Sept, 09:00–12:00 (Africa/Johannesburg)");
  assert.equal(isBookable("ACTIVE"), true);
  assert.equal(isBookable("MAINTENANCE"), false);
  assert.equal(toOfficeLocalInput(window.startAt), "2026-09-22T09:00");
  assert.equal(parseOfficeLocal("2026-09-22T09:00"), "2026-09-22T07:00:00.000Z");
  const policy = { minDurationMinutes: 15, maxDurationDays: 7, maxAdvanceDays: 30 };
  const now = new Date("2026-09-21T15:00:00Z").getTime();
  assert.equal(validateReservationWindow(window.startAt, window.endAt, policy, now), null);
  assert.equal(
    validateReservationWindow(window.startAt, window.startAt, policy, now),
    "End must be after start.",
  );
});

test("parseEquipmentQr accepts uuid, prefixed payload, url, or asset tag", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  assert.deepEqual(parseEquipmentQr(`  ${id}  `), { kind: "id", equipmentId: id });
  assert.deepEqual(parseEquipmentQr(`borrowhub:equipment:${id}`), { kind: "id", equipmentId: id });
  assert.deepEqual(parseEquipmentQr(`https://borrowhub.example/equipment/${id}`), { kind: "id", equipmentId: id });
  assert.deepEqual(parseEquipmentQr(`https://borrowhub.example/?equipmentId=${id}`), { kind: "id", equipmentId: id });
  assert.deepEqual(parseEquipmentQr("PHONE-001"), { kind: "query", query: "PHONE-001" });
  assert.equal(parseEquipmentQr("   "), null);
});

test("formatBookingReminder maps Java kinds", () => {
  assert.equal(formatBookingReminder("COLLECT_NOW"), "Collection is open.");
  assert.equal(formatBookingReminder("RETURN_NOW"), "Please return this asset.");
  assert.equal(formatBookingReminder("OVERDUE"), "This loan is overdue.");
});
