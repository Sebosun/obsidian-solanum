import { expect, test } from "@playwright/test";
import { settle } from "./helpers";

for (const crop of ["Tomato", "Corn", "Apple"] as const) {
  test(`${crop} has picked produce in the picker and a mature plant at completed focus`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/assets/crops/garden/**", (route) => route.abort());
    await page.goto("/?view=timer&season=summer");
    await page.getByRole("radio", { name: crop, exact: true }).click();
    await expect(page.getByRole("radio", { name: crop, exact: true })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(page.locator(".solanum-scene canvas")).toBeVisible();
    await settle(page);
    await page.screenshot({ path: testInfo.outputPath(`${crop.toLowerCase()}-produce.png`) });
    await page.goto(`/?view=timer&season=summer&crop=${crop.toLowerCase()}&elapsed=25`);
    await expect(page.getByRole("button", { name: "Start break", exact: true })).toBeVisible();
    await expect(page.locator(".solanum-scene canvas")).toBeVisible();
    await settle(page);
    await page.screenshot({ path: testInfo.outputPath(`${crop.toLowerCase()}-mature.png`) });
    expect(errors).toEqual([]);
  });
}

test("the year loads one Blender crate and fills it with produce, not tomato or apple trees", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let crates = 0;
  const produce = new Set<string>();
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path.endsWith("/native-assets/harvest/Crate.glb")) crates += 1;
    if (path.includes("/native-assets/crops/garden/") && path.endsWith("_produce.glb"))
      produce.add(path);
  });
  await page.goto("/");
  await expect(page.getByRole("status", { name: "Loading harvest" })).toBeHidden({
    timeout: 20_000,
  });
  await page.getByRole("button", { name: "Year", exact: true }).click();
  await expect(page.getByRole("status", { name: "Loading harvest" })).toBeHidden({
    timeout: 20_000,
  });
  await settle(page);
  expect(crates).toBe(1);
  expect(produce.size).toBe(3);
  await page.screenshot({ path: testInfo.outputPath("blender-crates-year.png") });
  expect(errors).toEqual([]);
});
