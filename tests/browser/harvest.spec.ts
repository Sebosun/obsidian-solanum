import { expect, test, type Page } from "@playwright/test";
import { settle } from "./helpers";

async function expectBlocksLoaded(page: Page) {
  await expect(page.getByRole("status", { name: "Loading harvest" })).toBeHidden({
    timeout: 20_000,
  });
  await expect(page.locator(".solanum-harvest-scene canvas")).toBeVisible();
  await expect(page.getByText("Farm unavailable")).toBeHidden();
}

for (const width of [240, 560]) {
  test(`harvest filters stay compact and summaries follow crops at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 800 });
    if (width === 240) await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    if (width === 560) {
      await page.addStyleTag({
        content:
          "body { --text-normal:#34352e; --text-muted:#606355; --background-primary:#f6f4ec; --background-secondary:#ebe8de; --background-modifier-border:#cbc8bc; }",
      });
    }
    const header = page.getByRole("group", { name: "Harvest controls", exact: true });
    const tag = header.getByRole("combobox", { name: "Filter by tag" });
    await expect(tag).toBeVisible();
    await expect(header.getByRole("combobox", { name: "Filter by note" })).toHaveCount(0);
    for (const period of ["Month", "Year"]) {
      if (period === "Year") {
        await header.getByRole("button", { name: "Year", exact: true }).focus();
        await page.keyboard.press("Enter");
      }
      await expectBlocksLoaded(page);
      const summary = page.getByRole("region", { name: `${period} summary` });
      await expect(summary.getByText("Focused", { exact: true })).toBeVisible();
      await expect(summary.getByText("Harvests", { exact: true })).toBeVisible();
      await expect(summary.getByText("Active days", { exact: true })).toBeVisible();
      const summaryBox = await summary.boundingBox();
      const stats = summary.locator(".solanum-summary-stats");
      const statsBox = await stats.boundingBox();
      const statItems = await stats.locator("div").all();
      for (const [index, item] of statItems.entries()) {
        const box = await item.boundingBox();
        const expectedCenter = statsBox!.x + statsBox!.width * ((index + 0.5) / 3);
        expect(Math.abs(box!.x + box!.width / 2 - expectedCenter)).toBeLessThan(4);
        const term = await item.locator("dt").boundingBox();
        const value = await item.locator("dd").boundingBox();
        expect(Math.abs(term!.x + term!.width / 2 - (value!.x + value!.width / 2))).toBeLessThan(2);
      }
      const scene = await page.locator(".solanum-harvest-scene").boundingBox();
      expect(scene!.y + scene!.height).toBeLessThanOrEqual(summaryBox!.y);
      const tagBox = await tag.boundingBox();
      expect(tagBox!.width).toBeLessThanOrEqual(112);
      expect(tagBox!.height).toBeLessThanOrEqual(28);
      await tag.selectOption("demo");
      if (period === "Year") await expect(page.locator(".solanum-stack-label")).toHaveCount(12);
      await expectBlocksLoaded(page);
      await settle(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        width,
      );
      await page.screenshot({
        path: testInfo.outputPath(`${period.toLowerCase()}-details.png`),
        fullPage: true,
      });
    }
    const filters = await page.locator(".solanum-filters").boundingBox();
    const toggle = await page
      .getByRole("group", { name: "Harvest range", exact: true })
      .boundingBox();
    expect(filters!.x + filters!.width).toBeLessThanOrEqual(toggle!.x);
    expect(Math.abs(filters!.y - toggle!.y)).toBeLessThan(4);
  });
}

test("month crops show persistent details below the scene on hover and keyboard inspection", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expectBlocksLoaded(page);
  await settle(page);
  const scene = page.getByRole("group", { name: "Harvest by session", exact: true });
  const bounds = await scene.boundingBox();
  const detail = page.getByRole("region", { name: "Harvest details" });
  await expect(detail).toHaveCount(0);
  // Hit actual crop geometry rather than a DOM stand-in or an invisible hotspot.
  for (const y of [0.6, 0.5, 0.7, 0.4]) {
    for (const x of [0.5, 0.35, 0.65]) {
      await page.mouse.move(bounds!.x + bounds!.width * x, bounds!.y + bounds!.height * y);
      if (await detail.isVisible()) break;
    }
    if (await detail.isVisible()) break;
  }
  await expect(detail).toBeVisible();
  await expect(detail.locator("strong")).toHaveText(/Tomato|Carrot|Corn|Pumpkin|Coconut|Apple/);
  await expect(detail.locator("time")).toHaveAttribute("datetime", /^2026-10-/);
  await expect(detail).toContainText(/\d+ min|\d+ h/);
  await expect(detail.locator("[title], [aria-label]")).toHaveCount(0);
  const card = await detail.boundingBox();
  expect(card!.y).toBeGreaterThanOrEqual(bounds!.y + bounds!.height);
  expect(card!.x).toBeGreaterThanOrEqual(bounds!.x);
  expect(card!.x + card!.width).toBeLessThanOrEqual(bounds!.x + bounds!.width);
  await page.screenshot({ path: testInfo.outputPath("harvest-hover.png") });
  await page.mouse.move(0, 0);
  await expect(detail).toBeVisible();
  await page.getByRole("button", { name: "Month summary", exact: true }).click();
  await expect(detail).toHaveCount(0);
  await scene.focus();
  await page.keyboard.press("ArrowRight");
  await expect(detail).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(detail).toHaveCount(0);
});

test.describe("touch harvest inspection", () => {
  test.use({ hasTouch: true });
  test("tapping a crop reveals persistent details and panel controls browse without targeting geometry", async ({
    page,
  }) => {
    await page.goto("/");
    await expectBlocksLoaded(page);
    await settle(page);
    const scene = page.getByRole("group", { name: "Harvest by session", exact: true });
    const bounds = await scene.boundingBox();
    const detail = page.getByRole("region", { name: "Harvest details" });
    for (const y of [0.6, 0.5, 0.7, 0.4]) {
      for (const x of [0.5, 0.35, 0.65]) {
        await page.touchscreen.tap(bounds!.x + bounds!.width * x, bounds!.y + bounds!.height * y);
        if (await detail.isVisible()) break;
      }
      if (await detail.isVisible()) break;
    }
    await expect(detail).toBeVisible();
    await expect(detail.locator("time")).toHaveAttribute("datetime", /^2026-10-/);
    await page.touchscreen.tap(bounds!.x + 5, bounds!.y + 5);
    await expect(detail).toBeVisible();
    const date = await detail.locator("time").getAttribute("datetime");
    await page.getByRole("button", { name: "Next harvest" }).tap();
    await expect(detail.locator("time")).not.toHaveAttribute("datetime", date!);
    await page.getByRole("button", { name: "Month summary", exact: true }).tap();
    await expect(detail).toHaveCount(0);
  });
});

for (const width of [240, 560]) {
  test(`panel browsing works without hovering crops at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 800 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    if (width === 560) {
      await page.addStyleTag({
        content:
          "body { --text-normal:#34352e; --text-muted:#606355; --background-primary:#f6f4ec; --background-secondary:#ebe8de; --background-modifier-border:#cbc8bc; }",
      });
    }
    await expectBlocksLoaded(page);
    await settle(page);
    const canvas = await page.locator(".solanum-month-scene canvas").elementHandle();
    const next = page.getByRole("button", { name: "Next harvest" });
    await next.focus();
    await page.keyboard.press("Enter");
    const detail = page.getByRole("region", { name: "Harvest details" });
    await expect(detail).toBeVisible();
    const firstDate = await detail.locator("time").getAttribute("datetime");
    await page.keyboard.press("Enter");
    await expect(detail.locator("time")).not.toHaveAttribute("datetime", firstDate!);
    await page.getByRole("button", { name: "Previous harvest" }).click();
    await expect(detail.locator("time")).toHaveAttribute("datetime", firstDate!);
    const scene = await page.locator(".solanum-month-scene").boundingBox();
    const panel = await detail.boundingBox();
    expect(panel!.y).toBeGreaterThanOrEqual(scene!.y + scene!.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width,
    );
    await page.screenshot({ path: testInfo.outputPath("harvest-panel.png"), fullPage: true });
    await page.keyboard.press("Escape");
    await expect(detail).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Month summary" })).toBeVisible();
    expect(await canvas!.evaluate((element) => element.isConnected)).toBe(true);
    await page.getByRole("button", { name: "Next harvest" }).click();
    await page.getByRole("button", { name: "Next month", exact: true }).click();
    await expect(detail).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Next harvest" })).toHaveCount(0);
  });
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
  await expect(page.getByText(/One block per harvest/)).toHaveCount(0);
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
  await expect(page.getByText(/Each crate stands for/)).toHaveCount(0);
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
