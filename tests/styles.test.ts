import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Obsidian-safe Tailwind bundle", () => {
  it("generates prefixed layout utilities and plugin theme tokens", () => {
    const css = readFileSync("styles.css", "utf8");
    expect(css).toContain("tailwindcss");
    expect(css).toContain(".sol\\:flex");
    expect(css).toContain(".sol\\:grid");
    expect(css).toContain("--sol-spacing");
    expect(css).not.toMatch(/(?:^|\})\s*\.(?:flex|grid|hidden)\s*\{/);
  });

  it("omits Preflight and keeps Obsidian-specific overrides scoped", () => {
    const source = readFileSync("src/styles.css", "utf8");
    expect(source).not.toContain('"tailwindcss/preflight.css"');
    expect(source).not.toContain('@import "tailwindcss"');
    expect(source).toContain("prefix(sol)");
    const css = readFileSync("styles.css", "utf8");
    expect(css).not.toMatch(/(?:^|\})\s*(?:html|body|button|input|h1)\s*\{/);
    expect(css).toContain(".solanum-app");
  });
});
