import { expect, test } from "@playwright/test";

test.describe("admin cloud", () => {
  test.skip(!process.env.CLOUD_WEB_URL, "P0-01: set CLOUD_WEB_URL to the Static Web App origin after a real deploy");

  test("cloud admin dashboard loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Office dashboard" })).toBeVisible();
  });
});
