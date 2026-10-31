import type { CSSProperties } from "react";
import type { SeasonTheme } from "@/lib/scene/seasons";

/** The custom properties the stylesheet reads to tint a scene's backdrop with the season. */
export interface SeasonStyle extends CSSProperties {
  "--season-glow": string;
  "--season-sun": string;
}

export function seasonStyle(theme: SeasonTheme): SeasonStyle {
  return { "--season-glow": theme.css.glow, "--season-sun": theme.css.sun };
}
