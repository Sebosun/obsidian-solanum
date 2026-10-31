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
