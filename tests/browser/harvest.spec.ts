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

test("the month reuses one baked platform asset for the entire harvest grid", async ({ page }) => {
  let platformReads = 0;
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.url().endsWith("/native-assets/stage/Farm_platform.glb")) platformReads += 1;
  });
  await page.goto("/");
  await expectBlocksLoaded(page);
  await page.waitForTimeout(1500);
  expect(platformReads).toBe(1);
  await page.screenshot({ path: "/tmp/opencode/solanum-month-platforms.png" });
  await page.getByRole("button", { name: "Year", exact: true }).click();
  await expectBlocksLoaded(page);
  await page.getByRole("button", { name: "Month", exact: true }).click();
  await expectBlocksLoaded(page);
  expect(platformReads).toBe(1);
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

test("the year is a stack of crates per month, and a stack opens its month", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expectBlocksLoaded(page);
  await page.getByRole("button", { name: "Year" }).click();
  await expectBlocksLoaded(page);
  await expect(page.locator(".solanum-stack-label")).toHaveCount(12);
  await expect(page.locator(".solanum-stack-label.is-busiest")).toHaveCount(1);
  await expect(page.getByText(/Each crate stands for/)).toBeVisible();
  // Keyboard: January, then across to October (nine presses right and down) and open it.
  await page.getByRole("group", { name: "Harvest by month" }).focus();
  for (const key of ["ArrowRight", "ArrowDown", "ArrowDown", "ArrowRight"])
    await page.keyboard.press(key);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: /^\w+ 2026$/ })).toBeVisible();
  await expectBlocksLoaded(page);
  expect(errors).toEqual([]);
});

/** Obsidian shows every aria-label and title as a tooltip over the element and what is inside it. */
function tooltipSources(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll("[aria-label], [title]")]
      .filter(
        (element) => !["BUTTON", "INPUT", "SELECT", "TEXTAREA", "A"].includes(element.tagName),
      )
      .map(
        (element) =>
          `${element.tagName.toLowerCase()}: ${element.getAttribute("aria-label") ?? element.getAttribute("title")}`,
      ),
  );
}

test("hovering the 3D views never pops up a label", async ({ page }) => {
  await page.goto("/");
  await expectBlocksLoaded(page);
  expect(await tooltipSources(page)).toEqual([]);
  await page.getByRole("button", { name: "Year" }).click();
  await expectBlocksLoaded(page);
  expect(await tooltipSources(page)).toEqual([]);
  await page.goto("/?view=timer");
  await expect(page.locator(".solanum-scene canvas")).toBeVisible();
  expect(await tooltipSources(page)).toEqual([]);
  // The scenes keep their names for assistive technology.
  await expect(page.getByRole("img", { name: "Growing crop" })).toBeVisible();
});
