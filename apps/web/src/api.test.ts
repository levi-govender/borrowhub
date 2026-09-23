import assert from "node:assert/strict";
import { test } from "node:test";
import { InventoryApiError, createInventoryApi, dashboardBookingFilter, formatAuditChange, formatFailureMessage, resolveBffBaseUrl } from "./api.ts";

test("resolveBffBaseUrl uses Vite env", () => {
  assert.equal(resolveBffBaseUrl({ VITE_BFF_BASE_URL: "http://bff.example/" }), "http://bff.example");
  assert.equal(
    resolveBffBaseUrl({ VITE_BFF_BASE_URL: "https://borrowhub-bff.example.azurecontainerapps.io/" }),
    "https://borrowhub-bff.example.azurecontainerapps.io",
  );
  assert.equal(resolveBffBaseUrl({}), "http://localhost:3000");
});

test("list calls the BFF admin catalogue with demo admin headers", async () => {
  const api = createInventoryApi("http://bff.test", async (input, init) => {
    assert.equal(
      String(input),
      "http://bff.test/api/v1/admin/equipment?category=phone&checkedOut=true&loanOverdue=true&page=1",
    );
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("x-demo-object-id"), "admin-1");
    assert.equal(headers.get("x-demo-role"), "ADMIN");
    return new Response(JSON.stringify({ items: [{ assetTag: "PHONE-001" }], page: 1, pageSize: 20, total: 1 }), {
      status: 200,
    });
  });
  const page = await api.list({ category: "phone", checkedOut: true, loanOverdue: true, page: 1 });
  assert.equal(page.total, 1);
});

test("maps BFF errors", async () => {
  const api = createInventoryApi("http://bff.test", async () => {
    return new Response(
      JSON.stringify({
        code: "UPSTREAM_UNAVAILABLE",
        message: "Java backend is unavailable.",
        traceId: "trace-503",
      }),
      {
        status: 503,
      },
    );
  });
  await assert.rejects(() => api.list(), (error: unknown) => {
    assert.ok(error instanceof InventoryApiError);
    assert.equal(error.status, 503);
    assert.equal(error.code, "UPSTREAM_UNAVAILABLE");
    assert.equal(error.traceId, "trace-503");
    assert.match(error.message, /trace-503/);
    return true;
  });
});

test("formatAuditChange and formatFailureMessage", () => {
  assert.equal(formatAuditChange({ status: "CANCELLED", reason: "needed" }), "status=CANCELLED; reason=needed");
  assert.equal(formatFailureMessage("OVERLAP", "That window is taken.", "abc"), "That window is taken. [OVERLAP; trace abc]");
});

test("loads the current user", async () => {
  const api = createInventoryApi("http://bff.test", async (input, init) => {
    assert.equal(String(input), "http://bff.test/api/v1/me");
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("x-demo-role"), "ADMIN");
    return new Response(JSON.stringify({ displayName: "admin-1", role: "ADMIN" }), { status: 200 });
  });
  const me = await api.me();
  assert.equal(me.role, "ADMIN");
});

test("dashboardBookingFilter maps overdue to checked-out overdue query", () => {
  assert.deepEqual(dashboardBookingFilter("overdue"), { status: "CHECKED_OUT", overdue: true });
  assert.deepEqual(dashboardBookingFilter("reserved"), { status: "RESERVED" });
  assert.deepEqual(dashboardBookingFilter("checkedOut"), { status: "CHECKED_OUT" });
});

test("listBookings sends a Johannesburg week window", async () => {
  const api = createInventoryApi("http://bff.test", async (input) => {
    assert.equal(
      String(input),
      "http://bff.test/api/v1/admin/bookings?from=2026-09-20T22%3A00%3A00.000Z&to=2026-09-27T22%3A00%3A00.000Z&pageSize=100",
    );
    return new Response(JSON.stringify({ items: [], page: 1, pageSize: 100, total: 0 }), { status: 200 });
  });
  const page = await api.listBookings({
    from: "2026-09-20T22:00:00.000Z",
    to: "2026-09-27T22:00:00.000Z",
    pageSize: 100,
  });
  assert.equal(page.total, 0);
});

test("listBookings sends damaged=true", async () => {
  const api = createInventoryApi("http://bff.test", async (input) => {
    assert.equal(String(input), "http://bff.test/api/v1/admin/bookings?damaged=true");
    return new Response(JSON.stringify({ items: [], page: 1, pageSize: 20, total: 0 }), { status: 200 });
  });
  const page = await api.listBookings({ damaged: true });
  assert.equal(page.total, 0);
});

test("listBookings sends overdue and status together", async () => {
  const api = createInventoryApi("http://bff.test", async (input) => {
    assert.equal(String(input), "http://bff.test/api/v1/admin/bookings?status=CHECKED_OUT&overdue=true&page=1");
    return new Response(JSON.stringify({ items: [], page: 1, pageSize: 20, total: 0 }), { status: 200 });
  });
  const page = await api.listBookings({ status: "CHECKED_OUT", overdue: true, page: 1 });
  assert.equal(page.total, 0);
});

test("loads overdue bookings and cancels with a reason", async () => {
  const api = createInventoryApi("http://bff.test", async (input, init) => {
    const url = String(input);
    if (url.includes("/api/v1/admin/summary")) {
      return new Response(JSON.stringify({ reserved: 0, checkedOut: 1, overdue: 1, activeEquipment: 9 }), {
        status: 200,
      });
    }
    if (url.includes("/api/v1/admin/bookings?") && url.includes("overdue=true")) {
      return new Response(JSON.stringify({ items: [{ id: "b1", overdue: true }], page: 1, pageSize: 20, total: 1 }), {
        status: 200,
      });
    }
    if (url.endsWith("/api/v1/admin/bookings/b1/cancel")) {
      const headers = new Headers(init?.headers);
      assert.ok(headers.get("idempotency-key"));
      assert.equal(init?.body, JSON.stringify({ reason: "Asset needed" }));
      return new Response(JSON.stringify({ id: "b1", status: "CANCELLED", audit: [] }), { status: 200 });
    }
    throw new Error(url);
  });
  const summary = await api.summary();
  assert.equal(summary.overdue, 1);
  const overdue = await api.listBookings({ overdue: true });
  assert.equal(overdue.total, 1);
  const cancelled = await api.cancelBooking("b1", "Asset needed");
  assert.equal(cancelled.status, "CANCELLED");
});

test("loads equipment detail and patches status", async () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const api = createInventoryApi("http://bff.test", async (input, init) => {
    const url = String(input);
    if (url.endsWith(`/api/v1/admin/equipment/${id}`) && (init?.method ?? "GET") === "GET") {
      return new Response(
        JSON.stringify({
          id,
          assetTag: "PHONE-001",
          name: "Pixel",
          category: "phone",
          description: "lab",
          location: "Cupboard A",
          operationalStatus: "ACTIVE",
          currentLoan: {
            bookingId: "22222222-2222-4222-8222-222222222222",
            borrower: "employee-a",
            startAt: "2026-09-20T08:00:00Z",
            endAt: "2026-09-20T10:00:00Z",
            overdue: true,
          },
        }),
        { status: 200 },
      );
    }
    if (url.endsWith(`/api/v1/admin/equipment/${id}`) && init?.method === "PATCH") {
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("x-demo-role"), "ADMIN");
      const body = JSON.parse(String(init?.body));
      assert.equal(body.operationalStatus, "MAINTENANCE");
      return new Response(JSON.stringify({ ...body, id, operationalStatus: "MAINTENANCE" }), { status: 200 });
    }
    throw new Error(url);
  });
  const detail = await api.get(id);
  assert.equal(detail.assetTag, "PHONE-001");
  assert.equal(detail.currentLoan?.borrower, "employee-a");
  assert.equal(detail.currentLoan?.overdue, true);
  const updated = await api.update(id, {
    assetTag: "PHONE-001",
    name: "Pixel",
    category: "phone",
    description: "lab",
    location: "Cupboard A",
    operationalStatus: "MAINTENANCE",
  });
  assert.equal(updated.operationalStatus, "MAINTENANCE");
});
