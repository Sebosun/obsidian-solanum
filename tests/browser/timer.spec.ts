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
