import assert from "node:assert/strict";
import { test } from "node:test";
import { InventoryApiError, createInventoryApi, dashboardBookingFilter, resolveBffBaseUrl } from "./api.ts";

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
    assert.equal(String(input), "http://bff.test/api/v1/admin/equipment?category=phone&page=1");
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("x-demo-object-id"), "admin-1");
    assert.equal(headers.get("x-demo-role"), "ADMIN");
    return new Response(JSON.stringify({ items: [{ assetTag: "PHONE-001" }], page: 1, pageSize: 20, total: 1 }), {
      status: 200,
    });
  });
  const page = await api.list({ category: "phone", page: 1 });
  assert.equal(page.total, 1);
});

test("maps BFF errors", async () => {
  const api = createInventoryApi("http://bff.test", async () => {
    return new Response(JSON.stringify({ code: "UPSTREAM_UNAVAILABLE", message: "Java backend is unavailable." }), {
      status: 503,
    });
  });
  await assert.rejects(() => api.list(), (error: unknown) => {
    assert.ok(error instanceof InventoryApiError);
    assert.equal(error.status, 503);
    return true;
  });
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
