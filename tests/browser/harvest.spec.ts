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

test("hovering another plot keeps the clicked day's details and no second grid is shown", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".solanum-plot-date")).toHaveCount(31, { timeout: 15_000 });
  // R3F keeps the canvas fallback in the DOM, but it is never displayed while WebGL works.
  await expect(page.locator(".solanum-calendar")).toBeHidden();
  const plotCorner = async (day: string) => {
    const box = await page
      .locator(".solanum-plot-date", { hasText: new RegExp(`^${day}`) })
      .boundingBox();
    if (!box) throw new Error(`Plot ${day} has no label`);
    // The label sits in a plot's top-left corner; step into the plot body.
    return { x: box.x + 14, y: box.y + 14 };
  };
  const selected = await plotCorner("19");
  await page.mouse.click(selected.x, selected.y);
  const details = page.getByRole("region", { name: "Harvest details" });
  await expect(details.getByRole("heading")).toContainText("October 19");
  const other = await plotCorner("12");
  await page.mouse.move(other.x, other.y);
  await page.waitForTimeout(300);
  await expect(details.getByRole("heading")).toContainText("October 19");
});
