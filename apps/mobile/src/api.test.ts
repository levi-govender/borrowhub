import assert from "node:assert/strict";
import { test } from "node:test";
import { CatalogueApiError, createCatalogueApi, defaultAvailabilityWindow, resolveBffBaseUrl } from "./api.ts";

test("resolveBffBaseUrl prefers env then android emulator loopback", () => {
  assert.equal(resolveBffBaseUrl({ EXPO_PUBLIC_BFF_BASE_URL: "http://10.0.0.5:3000/" }, "android"), "http://10.0.0.5:3000");
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
    return new Response(JSON.stringify({ code: "NOT_FOUND", message: "Equipment was not found." }), {
      status: 404,
    });
  });
  await assert.rejects(() => api.get("11111111-1111-4111-8111-111111111111"), (error: unknown) => {
    assert.ok(error instanceof CatalogueApiError);
    assert.equal(error.status, 404);
    return true;
  });
});

test("default availability window is 3 hours from tomorrow 07:00 UTC", () => {
  const window = defaultAvailabilityWindow(new Date("2026-09-21T15:00:00Z"));
  assert.equal(window.startAt, "2026-09-22T07:00:00.000Z");
  assert.equal(window.endAt, "2026-09-22T10:00:00.000Z");
});
