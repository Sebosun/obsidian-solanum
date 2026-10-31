import { expect, test, type Page } from "@playwright/test";
import { settle } from "./helpers";

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
  await settle(page);
  expect(errors).toEqual([]);
});

test("the month reuses one baked platform asset for the entire harvest grid", async ({
  page,
}, testInfo) => {
  let platformReads = 0;
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.url().endsWith("/native-assets/stage/Farm_platform.glb")) platformReads += 1;
  });
  await page.goto("/");
  await expectBlocksLoaded(page);
  await settle(page);
  expect(platformReads).toBe(1);
  await page.screenshot({ path: testInfo.outputPath("month-platforms.png") });
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

test("an empty month and an empty year still show the 3D view, with nothing on it", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expectBlocksLoaded(page);
  // The history in the harness ends in October 2026: November is empty.
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page.getByText("No harvests in November 2026 yet.")).toBeVisible();
  await expectBlocksLoaded(page);
  await expect(page.locator(".solanum-harvest-scene canvas")).toBeVisible();
  // It is not the flat message of old.
  await expect(page.getByText("No harvests yet", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Month summary" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Start focus" })).toBeVisible();
  // And an empty year shows its crates, as before.
  await page.getByRole("button", { name: "Year" }).click();
  await page.getByRole("button", { name: "Next year" }).click();
  await expect(page.getByText("No harvests in 2027 yet.")).toBeVisible();
  await expectBlocksLoaded(page);
  expect(errors).toEqual([]);
});
