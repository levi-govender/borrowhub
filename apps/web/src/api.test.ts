import assert from "node:assert/strict";
import { test } from "node:test";
import { InventoryApiError, createInventoryApi, resolveBffBaseUrl } from "./api.ts";

test("resolveBffBaseUrl uses Vite env", () => {
  assert.equal(resolveBffBaseUrl({ VITE_BFF_BASE_URL: "http://bff.example/" }), "http://bff.example");
  assert.equal(resolveBffBaseUrl({}), "http://localhost:3000");
});

test("list calls the BFF catalogue", async () => {
  const api = createInventoryApi("http://bff.test", async (input) => {
    assert.equal(String(input), "http://bff.test/api/v1/equipment?category=phone&page=1");
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
