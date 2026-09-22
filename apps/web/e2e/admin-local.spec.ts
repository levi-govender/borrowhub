import { expect, test } from "@playwright/test";

test.describe("admin local stack", () => {
  test.skip(Boolean(process.env.CLOUD_WEB_URL), "CLOUD_WEB_URL is set; run e2e/cloud.spec.ts instead");

  async function signInAsAdmin(page: import("@playwright/test").Page) {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await page.getByLabel("Demo object id").fill("admin-1");
    await page.getByRole("button", { name: "Continue" }).click();
  }

  test("dashboard shows demo admin and seeded inventory", async ({ page }) => {
    await signInAsAdmin(page);
    await expect(page.getByRole("heading", { name: "Office dashboard" })).toBeVisible();
    await expect(page.getByText(/Signed in as admin-1 \(ADMIN\)/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("region", { name: "Booking summary" })).toBeVisible();
    await expect(page.getByRole("button", { name: "View overdue loans" })).toBeVisible();
  });

  test("inventory search finds the seeded phone", async ({ page }) => {
    await signInAsAdmin(page);
    await page.getByRole("button", { name: "Inventory" }).click();
    await expect(page.getByRole("heading", { name: "Add asset" })).toBeVisible({ timeout: 30_000 });
    await page.getByLabel("Search").fill("PHONE-001");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByRole("cell", { name: "PHONE-001" })).toBeVisible();
  });
});
