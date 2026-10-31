import type { Page } from "@playwright/test";

/**
 * Waits for the page to go quiet: every model fetched (no network traffic for 500 ms) and the
 * canvas has drawn two more frames. Use it instead of a fixed pause before a screenshot, or before
 * asserting that nothing went wrong while the scene loaded.
 */
export async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}
