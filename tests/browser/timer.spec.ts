import { expect, test } from "@playwright/test";

test("the clock stays readable in a narrow immersive scene", async ({ page }) => {
  await page.setViewportSize({ width: 240, height: 800 });
  await page.goto("/?view=timer");
  await expect(page.getByRole("timer")).toHaveText("25:00");
  await page.getByRole("button", { name: "Start focus" }).click();
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(page.locator(".solanum-scene canvas")).toBeVisible();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "/tmp/opencode/solanum-timer.png" });
});

test("a light, reduced-motion sidebar keeps keyboard controls accessible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?view=timer");
  await page.addStyleTag({
    content:
      "body { --text-normal:#34352e; --text-muted:#606355; --background-primary:#f6f4ec; --background-secondary:#ebe8de; --background-modifier-border:#cbc8bc; }",
  });
  await page.evaluate(() => document.body.classList.replace("theme-dark", "theme-light"));
  await page.getByRole("button", { name: "Start focus" }).click();
  await expect(page.getByRole("timer")).toHaveText("25:00");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
  await page.screenshot({ path: "/tmp/opencode/solanum-timer-light.png" });
});

for (const season of ["winter", "spring", "summer", "autumn"] as const) {
  test(`the crop scene renders its ${season} theme without errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/?view=timer&season=${season}`);
    await expect(page.locator(`.solanum-scene.is-${season} canvas`)).toBeVisible();
    await page.waitForTimeout(1200);
    expect(errors).toEqual([]);
  });
}

test("changing the crop animates inside the same canvas without errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?view=timer");
  const canvas = await page.locator(".solanum-scene canvas").elementHandle();
  await page.waitForTimeout(1500);
  for (const crop of ["Carrot", "Corn", "Pumpkin", "Tomato"]) {
    await page.getByRole("radio", { name: crop }).click();
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(1000);
  expect(await canvas?.evaluate((element) => element.isConnected)).toBe(true);
  await expect(page.getByRole("radio", { name: "Tomato" })).toHaveAttribute("aria-checked", "true");
  expect(errors).toEqual([]);
});

test("loading a crop for the first time never flashes a placeholder icon", async ({ page }) => {
  // Slow models down so a placeholder would have time to show, if there were one.
  await page.route("**/assets/crops/*.glb", async (route) => {
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
