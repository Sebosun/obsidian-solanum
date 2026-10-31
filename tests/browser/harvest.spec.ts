import { expect, test } from "@playwright/test";

test("a populated harvest finishes loading real GLBs in the real renderer", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".solanum-plot-date")).toHaveCount(31, { timeout: 15_000 });
  await expect(page.getByText("Farm unavailable")).toBeHidden();
  expect(errors).toEqual([]);
});

test("harvest loads through the vault binary adapter when resource URLs are unavailable", async ({
  page,
}) => {
  await page.route("**/assets/crops/**", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator(".solanum-plot-date")).toHaveCount(31, { timeout: 15_000 });
  await expect(page.getByText("Farm unavailable")).toBeHidden();
});
