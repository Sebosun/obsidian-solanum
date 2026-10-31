import { expect, test, type Page } from "@playwright/test";

async function expectBlocksLoaded(page: Page) {
  await expect(page.getByRole("status", { name: "Loading harvest" })).toBeHidden({
    timeout: 20_000,
  });
  await expect(page.locator(".solanum-harvest-scene canvas")).toBeVisible();
  await expect(page.getByText("Farm unavailable")).toBeHidden();
}

test("a populated month finishes loading real GLBs in the real renderer", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expectBlocksLoaded(page);
  await expect(page.getByRole("region", { name: "Month summary" })).toBeVisible();
  await page.waitForTimeout(1500);
  expect(errors).toEqual([]);
});

test("the month loads through the vault binary adapter when resource URLs are unavailable", async ({
  page,
}) => {
  await page.route("**/assets/crops/**", (route) => route.abort());
  await page.goto("/");
  await expectBlocksLoaded(page);
});

test("the month is blocks and numbers, with no calendar days to pick", async ({ page }) => {
  await page.goto("/");
  await expectBlocksLoaded(page);
  await expect(page.locator(".solanum-calendar")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^2026-10-\d\d/ })).toHaveCount(0);
  await expect(page.getByText(/One block per harvest/)).toBeVisible();
});

test("the year overview opens a month back into the blocks", async ({ page }) => {
  await page.goto("/");
  await expectBlocksLoaded(page);
  await page.getByRole("button", { name: "Year" }).click();
  await expect(page.locator(".solanum-year-month")).toHaveCount(12);
  await page.getByRole("button", { name: /^October 2026, \d+ focused minutes$/ }).click();
  await expect(page.getByRole("heading", { name: "October 2026" })).toBeVisible();
  await expectBlocksLoaded(page);
});
