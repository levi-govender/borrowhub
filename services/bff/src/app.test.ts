import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApp } from "./app.js";

const equipmentId = "11111111-1111-4111-8111-111111111111";

test("lists equipment from Java", async () => {
  const app = await buildApp({
    fetchImpl: async (input) => {
      const url = String(input);
      assert.match(url, /\/v1\/equipment\?query=phone$/);
      return new Response(JSON.stringify({ items: [{ id: equipmentId, name: "Pixel" }], page: 1, pageSize: 20, total: 1 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
    javaBaseUrl: "http://java.test",
  });
  const response = await app.inject({ method: "GET", url: "/api/v1/equipment?query=phone" });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().total, 1);
  assert.equal(response.json().items[0].name, "Pixel");
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
