import { expect, test, type Page } from "@playwright/test";
import { settle } from "./helpers";

/** How many pixels differ between two screenshots by more than `tolerance` (out of 255). */
async function changedPixels(page: Page, a: Buffer, b: Buffer, tolerance: number) {
  return page.evaluate(
    async ([first, second, limit]) => {
      const load = (data: string) =>
        new Promise<ImageData>((resolve) => {
          const image = new Image();
          image.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = image.width;
            canvas.height = image.height;
            const context = canvas.getContext("2d")!;
            context.drawImage(image, 0, 0);
            resolve(context.getImageData(0, 0, image.width, image.height));
          };
          image.src = `data:image/png;base64,${data}`;
        });
      const [one, two] = await Promise.all([load(first as string), load(second as string)]);
      let changed = 0;
      for (let i = 0; i < one.data.length; i += 4)
        for (let channel = 0; channel < 3; channel += 1)
          if (Math.abs(one.data[i + channel] - two.data[i + channel]) > (limit as number)) {
            changed += 1;
            break;
          }
      return changed;
    },
    [a.toString("base64"), b.toString("base64"), tolerance],
  );
}

/** Every timer scene has the same frame: time centred at the top, a bar along the very bottom, no sun. */
async function expectFrame(page: Page, progressName: string) {
  await expect(page.locator(".solanum-clock-arc, .solanum-clock-sun, .solanum-sky")).toHaveCount(0);
  const frame = await page.locator(".solanum-scene").boundingBox();
  const header = await page.locator(".solanum-time-header").boundingBox();
  const bar = await page.getByRole("progressbar", { name: progressName }).boundingBox();
  expect(frame && header && bar).toBeTruthy();
  expect(header!.y + header!.height).toBeLessThan(frame!.y + frame!.height * 0.3);
  expect(Math.abs(header!.x + header!.width / 2 - (frame!.x + frame!.width / 2))).toBeLessThan(4);
  // The bar is flush with the very bottom edge and spans the whole width; the scene's rounded
  // corners clip its ends, so it follows the border.
  expect(Math.abs(bar!.y + bar!.height - (frame!.y + frame!.height))).toBeLessThan(1.5);
  expect(Math.abs(bar!.x - frame!.x)).toBeLessThan(1.5);
  expect(Math.abs(bar!.width - frame!.width)).toBeLessThan(1.5);
  expect(bar!.height).toBeLessThan(10);
}

test("the new baked platform loads through the vault binary adapter, without resource URLs", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/assets/stage/**", (route) => route.abort());
  const platform = page.waitForResponse((response) =>
    response.url().endsWith("/native-assets/stage/Farm_platform.glb"),
  );
  await page.goto("/?view=timer&season=summer");
  expect((await platform).ok()).toBe(true);
  await expect(page.locator(".solanum-scene canvas")).toBeVisible();
  await settle(page);
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("farm-platform.png") });
});

test("the clock stays readable in a narrow immersive scene", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 240, height: 800 });
  await page.goto("/?view=timer");
  await expect(page.getByRole("timer")).toHaveText("25:00");
  await page.getByRole("button", { name: "Start focus" }).click();
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(page.locator(".solanum-scene canvas")).toBeVisible();
  await settle(page);
  await page.screenshot({ path: testInfo.outputPath("timer.png") });
});

for (const viewport of [
  { width: 240, height: 800 },
  { width: 320, height: 720 },
  { width: 640, height: 420 },
]) {
  test(`running and paused use one full-view canvas with actions below the timer at ${viewport.width}x${viewport.height}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto("/?view=timer");
    await expect(page.locator("button[title]")).toHaveCount(0);
    const canvas = await page.locator(".solanum-scene canvas").elementHandle();
    await page.getByRole("button", { name: "Start focus" }).click();
    await settle(page);
    for (const action of ["Pause", "Resume"]) {
      await expect(page.getByRole("navigation")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Show timer controls" })).toHaveCount(0);
      const frame = await page.locator(".solanum-scene").boundingBox();
      const controls = await page.locator(".solanum-scene-controls").boundingBox();
      const header = await page.locator(".solanum-time-header").boundingBox();
      expect(frame && controls).toBeTruthy();
      expect(frame!.width).toBeGreaterThanOrEqual(viewport.width - 2);
      expect(frame!.height).toBeGreaterThanOrEqual(viewport.height - 2);
      expect(
        Math.abs(controls!.x + controls!.width / 2 - (frame!.x + frame!.width / 2)),
      ).toBeLessThan(2);
      const gap = controls!.y - (header!.y + header!.height);
      expect(gap).toBeGreaterThanOrEqual(8);
      expect(gap).toBeLessThanOrEqual(16);
      expect(controls!.x + controls!.width).toBeLessThan(frame!.x + frame!.width);
      expect(await canvas?.evaluate((element) => element.isConnected)).toBe(true);
      await expect(page.getByRole("button", { name: "End focus" })).toBeVisible();
      await expect(page.locator("button[title]")).toHaveCount(0);
      await page.screenshot({ path: testInfo.outputPath(`${action.toLowerCase()}.png`) });
      await page.getByRole("button", { name: action, exact: true }).click();
    }
    await page.getByRole("button", { name: "End focus" }).click();
    await expect(page.getByRole("button", { name: "Start focus" })).toBeVisible();
  });
}

test.describe("touch controls", () => {
  test.use({ hasTouch: true });

  test("pauses and stops without leaving the full-view scene", async ({ page }) => {
    await page.goto("/?view=timer");
    await page.getByRole("button", { name: "Start focus" }).tap();
    await page.getByRole("button", { name: "Pause", exact: true }).tap();
    await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
    await expect(page.getByRole("navigation")).toHaveCount(0);
    await page.getByRole("button", { name: "End focus" }).tap();
    await expect(page.getByRole("button", { name: "Start focus" })).toBeVisible();
  });
});

test("a light, reduced-motion sidebar keeps keyboard controls accessible", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?view=timer");
  await page.addStyleTag({
    content:
      "body { --text-normal:#34352e; --text-muted:#606355; --background-primary:#f6f4ec; --background-secondary:#ebe8de; --background-modifier-border:#cbc8bc; }",
  });
  await page.evaluate(() => document.body.classList.replace("theme-dark", "theme-light"));
  await page.getByRole("button", { name: "Start focus" }).click();
  await expect(page.getByRole("timer")).toHaveText("25:00");
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await page.getByRole("button", { name: "Pause" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("timer-light.png") });
});

for (const season of ["winter", "spring", "summer", "autumn"] as const) {
  test(`the crop scene renders its ${season} theme without errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/?view=timer&season=${season}`);
    await expect(page.locator(`.solanum-scene.is-${season} canvas`)).toBeVisible();
    await settle(page);
    expect(errors).toEqual([]);
  });
}

test("changing the crop animates inside the same canvas without errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?view=timer");
  const canvas = await page.locator(".solanum-scene canvas").elementHandle();
  await settle(page);
  for (const crop of ["Carrot", "Corn", "Pumpkin", "Tomato"]) {
    await page.getByRole("radio", { name: crop }).click();
    await expect(page.getByRole("radio", { name: crop })).toHaveAttribute("aria-checked", "true");
  }
  await settle(page);
  expect(await canvas?.evaluate((element) => element.isConnected)).toBe(true);
  await expect(page.getByRole("radio", { name: "Tomato" })).toHaveAttribute("aria-checked", "true");
  expect(errors).toEqual([]);
});

test("loading a crop for the first time never flashes a placeholder icon", async ({ page }) => {
  // Slow models down so a placeholder would have time to show, if there were one.
  await page.route("**/assets/**/*.glb", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    await route.continue();
  });
  // The canvas keeps its fallback markup for browsers without WebGL; it is never displayed.
  const placeholderShown = () =>
    page.evaluate(() =>
      [...document.querySelectorAll(".solanum-crop-fallback")].some(
        (element) => element.getBoundingClientRect().width > 0,
      ),
    );
  await page.goto("/?view=timer");
  await expect(page.locator(".solanum-scene canvas")).toBeVisible();
  const watch = async (ms: number) => {
    const until = Date.now() + ms;
    while (Date.now() < until) {
      expect(await placeholderShown()).toBe(false);
      // Sampling interval: the placeholder must never appear, which is only observable by looking repeatedly.
      await page.waitForTimeout(50);
    }
  };
  await watch(1200);
  // Choosing a crop whose models are not loaded yet.
  await page.getByRole("radio", { name: "Coconut" }).click();
  await watch(2500);
  // Starting, which needs the first growth stage.
  await page.getByRole("button", { name: "Start focus" }).click();
  await watch(2500);
  await expect(page.getByRole("timer")).toBeVisible();
});

test("the break is a cat asleep beside a steaming mug, and it moves", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?view=timer&break=1");
  const scene = page.getByRole("img", { name: "A cat sleeping beside a cup of coffee" });
  await expect(scene).toBeVisible();
  await expect(page.getByRole("timer")).toHaveText(/0[34]:\d\d/);
  await expect(page.getByText("Break time", { exact: true })).toBeVisible();
  await expectFrame(page, "Break progress");
  // Nothing is shown in place of the scene while the cat's model loads.
  expect(
    await page.evaluate(() =>
      [...document.querySelectorAll(".solanum-crop-fallback")].some(
        (element) => element.getBoundingClientRect().width > 0,
      ),
    ),
  ).toBe(false);
  await settle(page);
  const first = await scene.screenshot();
  // The steam climbs and the cat breathes, so the picture changes; poll until it has.
  await expect
    .poll(async () => changedPixels(page, first, await scene.screenshot(), 12), { timeout: 10_000 })
    .toBeGreaterThan(20);
  // Break controls sit directly below the countdown, just like focus controls.
  const skip = page.getByRole("button", { name: "Skip break" });
  await expect(skip).toBeVisible();
  const frame = await page.locator(".solanum-scene").boundingBox();
  const button = await skip.boundingBox();
  const header = await page.locator(".solanum-time-header").boundingBox();
  expect(frame && button && header).toBeTruthy();
  expect(button!.y).toBeGreaterThanOrEqual(header!.y + header!.height + 8);
  expect(button!.y).toBeLessThanOrEqual(header!.y + header!.height + 16);
  expect(errors).toEqual([]);
});

test("under reduced motion the break holds still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?view=timer&break=1");
  // The time and the bar tick every second; only the 3D scene is being compared.
  await page.addStyleTag({
    content: ".solanum-time-header, .solanum-progress { display: none !important; }",
  });
  const scene = page.getByRole("img", { name: "A cat sleeping beside a cup of coffee" });
  await expect(scene).toBeVisible();
  await settle(page);
  const first = await scene.screenshot();
  // Nothing animating is a claim about a stretch of time: this is the observation window.
  await page.waitForTimeout(1200);
  const second = await scene.screenshot();
  // Only the light dimming a hair as the break's sun moves: nothing animates.
  expect(await changedPixels(page, first, second, 12)).toBe(0);
});

test("the focus timer has the same frame as the break: the time at the top, a bar along the bottom", async ({
  page,
}) => {
  await page.goto("/?view=timer&elapsed=5");
  await expect(page.locator(".solanum-scene canvas")).toBeVisible();
  await expect(page.getByRole("timer")).toHaveText(/\d\d:\d\d/);
  await expectFrame(page, "Focus progress");
  // Five of the twenty-five minutes have gone, so the bar is about a fifth full.
  const fill = await page.locator(".solanum-progress-fill").evaluate((element) => {
    const match = /scaleX\(([\d.e-]+)\)/.exec((element as HTMLElement).style.transform);
    return Number(match?.[1]);
  });
  expect(fill).toBeGreaterThan(0.15);
  expect(fill).toBeLessThan(0.3);
});

test("before a session starts the frame is the same, with the bar empty", async ({ page }) => {
  await page.goto("/?view=timer");
  await expect(page.locator(".solanum-scene canvas")).toBeVisible();
  await expect(page.getByRole("timer")).toHaveText("25:00");
  await expect(page.getByRole("progressbar", { name: "Focus progress" })).toBeVisible();
});
