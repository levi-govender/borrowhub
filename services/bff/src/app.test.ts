import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApp } from "./app.js";

const equipmentId = "11111111-1111-4111-8111-111111111111";

test("lists equipment from Java", async () => {
  const app = await buildApp({
    fetchImpl: async (input, init) => {
      const url = String(input);
      assert.match(url, /\/v1\/equipment\?query=phone$/);
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("x-correlation-id"), "trace-lookup-1");
      return new Response(JSON.stringify({ items: [{ id: equipmentId, name: "Pixel" }], page: 1, pageSize: 20, total: 1 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
    javaBaseUrl: "http://java.test",
  });
  const response = await app.inject({
    method: "GET",
    url: "/api/v1/equipment?query=phone",
    headers: { "x-correlation-id": "trace-lookup-1" },
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().total, 1);
  assert.equal(response.json().items[0].name, "Pixel");
  assert.equal(response.headers["x-correlation-id"], "trace-lookup-1");
  await app.close();
});

test("maps Java 404 to client 404", async () => {
  const app = await buildApp({
    fetchImpl: async () =>
      new Response(JSON.stringify({ code: "NOT_FOUND", message: "Equipment was not found.", traceId: "t1", fieldErrors: {} }), {
        status: 404,
        headers: { "content-type": "application/json" },
      }),
    javaBaseUrl: "http://java.test",
  });
  const response = await app.inject({ method: "GET", url: `/api/v1/equipment/${equipmentId}` });
  assert.equal(response.statusCode, 404);
  assert.equal(response.json().code, "NOT_FOUND");
  await app.close();
});

test("rejects a non-uuid equipment id", async () => {
  const app = await buildApp({
    fetchImpl: async () => {
      throw new Error("Java should not be called");
    },
    javaBaseUrl: "http://java.test",
  });
  const response = await app.inject({ method: "GET", url: "/api/v1/equipment/not-a-uuid" });
  assert.equal(response.statusCode, 400);
  assert.equal(response.json().code, "VALIDATION_ERROR");
  await app.close();
});

test("creates a booking through Java", async () => {
  const app = await buildApp({
    fetchImpl: async (input, init) => {
      const url = String(input);
      assert.match(url, /\/v1\/bookings$/);
      assert.equal(init?.method, "POST");
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("x-demo-object-id"), "employee-a");
      assert.equal(headers.get("idempotency-key"), "33333333-3333-4333-8333-333333333333");
      return new Response(
        JSON.stringify({
          id: "22222222-2222-4222-8222-222222222222",
          status: "RESERVED",
          allowedActions: ["CANCEL"],
        }),
        { status: 201, headers: { "content-type": "application/json" } },
      );
    },
    javaBaseUrl: "http://java.test",
  });
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/bookings",
    headers: {
      "x-demo-object-id": "employee-a",
      "content-type": "application/json",
      "idempotency-key": "33333333-3333-4333-8333-333333333333",
    },
    payload: { equipmentId, startAt: "2026-09-22T07:00:00Z", endAt: "2026-09-22T10:00:00Z" },
  });
  assert.equal(response.statusCode, 201);
  assert.equal(response.json().status, "RESERVED");
  await app.close();
});

test("rejects booking create without an idempotency key", async () => {
  const app = await buildApp({
    fetchImpl: async () => {
      throw new Error("Java should not be called");
    },
    javaBaseUrl: "http://java.test",
  });
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/bookings",
    headers: { "x-demo-object-id": "employee-a", "content-type": "application/json" },
    payload: { equipmentId, startAt: "2026-09-22T07:00:00Z", endAt: "2026-09-22T10:00:00Z" },
  });
  assert.equal(response.statusCode, 400);
  assert.equal(response.json().code, "VALIDATION_ERROR");
  await app.close();
});

test("lists own bookings and cancels through Java", async () => {
  const bookingId = "22222222-2222-4222-8222-222222222222";
  const app = await buildApp({
    fetchImpl: async (input, init) => {
      const url = String(input);
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("x-demo-object-id"), "employee-a");
      if (url.endsWith("/v1/bookings") && (init?.method ?? "GET") === "GET") {
        return new Response(JSON.stringify({ items: [{ id: bookingId }], page: 1, pageSize: 20, total: 1 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.endsWith(`/v1/bookings/${bookingId}/cancel`)) {
        assert.equal(init?.method, "POST");
        assert.equal(headers.get("idempotency-key"), "44444444-4444-4444-8444-444444444444");
        assert.equal(JSON.parse(String(init?.body)).reason, "Plans changed");
        return new Response(JSON.stringify({ id: bookingId, status: "CANCELLED" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      throw new Error(`unexpected ${init?.method} ${url}`);
    },
    javaBaseUrl: "http://java.test",
  });
  const list = await app.inject({
    method: "GET",
    url: "/api/v1/bookings",
    headers: { "x-demo-object-id": "employee-a" },
  });
  assert.equal(list.statusCode, 200);
  assert.equal(list.json().total, 1);
  const cancel = await app.inject({
    method: "POST",
    url: `/api/v1/bookings/${bookingId}/cancel`,
    headers: {
      "x-demo-object-id": "employee-a",
      "idempotency-key": "44444444-4444-4444-8444-444444444444",
    },
    payload: { reason: "Plans changed" },
  });
  assert.equal(cancel.statusCode, 200);
  assert.equal(cancel.json().status, "CANCELLED");
  await app.close();
});

test("collects and returns a booking through Java", async () => {
  const bookingId = "22222222-2222-4222-8222-222222222222";
  const app = await buildApp({
    fetchImpl: async (input, init) => {
      const url = String(input);
      const headers = new Headers(init?.headers);
      assert.equal(init?.method, "POST");
      assert.equal(headers.get("x-demo-object-id"), "employee-a");
      if (url.endsWith(`/v1/bookings/${bookingId}/collect`)) {
        return new Response(JSON.stringify({ id: bookingId, status: "CHECKED_OUT" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.endsWith(`/v1/bookings/${bookingId}/return`)) {
        assert.equal(init?.body, JSON.stringify({ damageNote: "scratched" }));
        return new Response(JSON.stringify({ id: bookingId, status: "RETURNED", damageNote: "scratched" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      throw new Error(`unexpected ${url}`);
    },
    javaBaseUrl: "http://java.test",
  });
  const collect = await app.inject({
    method: "POST",
    url: `/api/v1/bookings/${bookingId}/collect`,
    headers: {
      "x-demo-object-id": "employee-a",
      "idempotency-key": "55555555-5555-4555-8555-555555555555",
    },
  });
  assert.equal(collect.statusCode, 200);
  assert.equal(collect.json().status, "CHECKED_OUT");
  const returned = await app.inject({
    method: "POST",
    url: `/api/v1/bookings/${bookingId}/return`,
    headers: {
      "x-demo-object-id": "employee-a",
      "idempotency-key": "66666666-6666-4666-8666-666666666666",
    },
    payload: { damageNote: "scratched" },
  });
  assert.equal(returned.statusCode, 200);
  assert.equal(returned.json().status, "RETURNED");
  await app.close();
});

test("admin routes forward demo role and PATCH", async () => {
  const equipmentId = "11111111-1111-4111-8111-111111111111";
  const bookingId = "22222222-2222-4222-8222-222222222222";
  const app = await buildApp({
    fetchImpl: async (input, init) => {
      const url = String(input);
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("x-demo-object-id"), "admin-1");
      assert.equal(headers.get("x-demo-role"), "ADMIN");
      if (url.endsWith("/v1/admin/summary")) {
        return new Response(JSON.stringify({ reserved: 1, checkedOut: 2, overdue: 1, activeEquipment: 10 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.includes("/v1/admin/equipment") && (init?.method ?? "GET") === "GET" && !url.includes(equipmentId)) {
        return new Response(JSON.stringify({ items: [{ id: equipmentId, operationalStatus: "ARCHIVED" }], total: 1 }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.endsWith(`/v1/admin/equipment/${equipmentId}`) && init?.method === "PATCH") {
        return new Response(JSON.stringify({ id: equipmentId, operationalStatus: "MAINTENANCE" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.endsWith(`/v1/admin/bookings/${bookingId}/cancel`)) {
        assert.equal(init?.method, "POST");
        assert.equal(headers.get("idempotency-key"), "77777777-7777-4777-8777-777777777777");
        assert.equal(init?.body, JSON.stringify({ reason: "Needed for repair" }));
        return new Response(JSON.stringify({ id: bookingId, status: "CANCELLED" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      throw new Error(`unexpected ${init?.method} ${url}`);
    },
    javaBaseUrl: "http://java.test",
  });
  const summary = await app.inject({
    method: "GET",
    url: "/api/v1/admin/summary",
    headers: { "x-demo-object-id": "admin-1", "x-demo-role": "ADMIN" },
  });
  assert.equal(summary.statusCode, 200);
  assert.equal(summary.json().overdue, 1);
  const list = await app.inject({
    method: "GET",
    url: "/api/v1/admin/equipment",
    headers: { "x-demo-object-id": "admin-1", "x-demo-role": "ADMIN" },
  });
  assert.equal(list.statusCode, 200);
  assert.equal(list.json().items[0].operationalStatus, "ARCHIVED");
  const patch = await app.inject({
    method: "PATCH",
    url: `/api/v1/admin/equipment/${equipmentId}`,
    headers: {
      "x-demo-object-id": "admin-1",
      "x-demo-role": "ADMIN",
      "content-type": "application/json",
    },
    payload: { operationalStatus: "MAINTENANCE" },
  });
  assert.equal(patch.statusCode, 200);
  const cancel = await app.inject({
    method: "POST",
    url: `/api/v1/admin/bookings/${bookingId}/cancel`,
    headers: {
      "x-demo-object-id": "admin-1",
      "x-demo-role": "ADMIN",
      "content-type": "application/json",
      "idempotency-key": "77777777-7777-4777-8777-777777777777",
    },
    payload: { reason: "Needed for repair" },
  });
  assert.equal(cancel.statusCode, 200);
  assert.equal(cancel.json().status, "CANCELLED");
  await app.close();
});

test("exchanges a bearer token on behalf of the user", async () => {
  const app = await buildApp({
    fetchImpl: async (input, init) => {
      const url = String(input);
      if (url === "https://login.microsoftonline.com/tenant-a/oauth2/v2.0/token") {
        assert.equal(init?.method, "POST");
        const body = String(init?.body);
        assert.match(body, /requested_token_use=on_behalf_of/);
        assert.match(body, /assertion=user-token/);
        return new Response(JSON.stringify({ access_token: "java-token" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url.endsWith("/v1/me")) {
        const headers = new Headers(init?.headers);
        assert.equal(headers.get("authorization"), "Bearer java-token");
        return new Response(JSON.stringify({ displayName: "Ada Admin", role: "ADMIN" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      throw new Error(`unexpected ${url}`);
    },
    javaBaseUrl: "http://java.test",
    entraTenantId: "tenant-a",
    entraBffClientId: "bff-client",
    entraBffClientSecret: "bff-secret",
    entraJavaScope: "api://java/.default",
  });
  const response = await app.inject({
    method: "GET",
    url: "/api/v1/me",
    headers: { authorization: "Bearer user-token" },
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().role, "ADMIN");
  await app.close();
});

test("returns 503 when a bearer token is sent without OBO config", async () => {
  const app = await buildApp({
    fetchImpl: async () => {
      throw new Error("Java should not be called");
    },
    javaBaseUrl: "http://java.test",
  });
  const response = await app.inject({
    method: "GET",
    url: "/api/v1/me",
    headers: { authorization: "Bearer user-token" },
  });
  assert.equal(response.statusCode, 503);
  assert.equal(response.json().code, "IDENTITY_NOT_CONFIGURED");
  await app.close();
});

test("loads demo me through Java", async () => {
  const app = await buildApp({
    fetchImpl: async (input, init) => {
      assert.match(String(input), /\/v1\/me$/);
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("x-demo-object-id"), "admin-1");
      assert.equal(headers.get("x-demo-role"), "ADMIN");
      return new Response(JSON.stringify({ displayName: "admin-1", role: "ADMIN" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
    javaBaseUrl: "http://java.test",
  });
  const response = await app.inject({
    method: "GET",
    url: "/api/v1/me",
    headers: { "x-demo-object-id": "admin-1", "x-demo-role": "ADMIN" },
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().role, "ADMIN");
  await app.close();
});

test("forwards admin booking window to Java", async () => {
  const app = await buildApp({
    fetchImpl: async (input, init) => {
      const url = String(input);
      assert.match(url, /\/v1\/admin\/bookings\?from=2026-09-20T22%3A00%3A00.000Z&to=2026-09-27T22%3A00%3A00.000Z$/);
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("x-demo-role"), "ADMIN");
      return new Response(JSON.stringify({ items: [], page: 1, pageSize: 100, total: 0 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
    javaBaseUrl: "http://java.test",
  });
  const response = await app.inject({
    method: "GET",
    url: "/api/v1/admin/bookings?from=2026-09-20T22:00:00.000Z&to=2026-09-27T22:00:00.000Z",
    headers: { "x-demo-object-id": "admin-1", "x-demo-role": "ADMIN" },
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().total, 0);
  await app.close();
});

test("readiness fails when Java is down", async () => {
  const app = await buildApp({
    fetchImpl: async () => {
      throw new TypeError("fetch failed");
    },
    javaBaseUrl: "http://java.test",
  });
  const response = await app.inject({ method: "GET", url: "/health/ready" });
  assert.equal(response.statusCode, 503);
  await app.close();
});
