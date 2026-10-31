import { Color } from "three";
import { SEASON_THEMES, type SeasonId } from "@/lib/scene/seasons";

/** Blends a colour towards the season's ground tint, e.g. snow in winter. Returns a hex string. */
export function seasonalColor(hex: string, season: SeasonId): string {
  const { color, amount } = SEASON_THEMES[season].groundTint;
  return `#${new Color(hex).lerp(new Color(color), amount).getHexString()}`;
}
