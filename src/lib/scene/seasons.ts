export type SeasonId = "winter" | "spring" | "summer" | "autumn";
export type SeasonChoice = "auto" | SeasonId;
export type ParticleKind = "snow" | "petals" | "motes" | "leaves";

export const SEASON_CHOICES: readonly SeasonChoice[] = [
  "auto",
  "winter",
  "spring",
  "summer",
  "autumn",
];

/** Meteorological seasons for the northern hemisphere; the setting overrides them elsewhere. */
const SEASON_BY_MONTH: readonly SeasonId[] = [
  "winter",
  "winter",
  "spring",
  "spring",
  "spring",
  "summer",
  "summer",
  "summer",
  "autumn",
  "autumn",
  "autumn",
  "winter",
];

export function seasonOf(date: Date): SeasonId {
  return SEASON_BY_MONTH[date.getMonth()];
}

export function resolveSeason(choice: SeasonChoice, date: Date): SeasonId {
  return choice === "auto" ? seasonOf(date) : choice;
}

export interface ParticleTheme {
  kind: ParticleKind;
  count: number;
  colors: readonly string[];
  /** How big a particle is, across, in world units. */
  size: number;
  /** World units per second. Positive falls, negative rises. */
  fall: number;
  /** Sideways drift in world units. */
  sway: number;
  /** Drift cycles per second. */
  swayHz: number;
  /** How fast a particle turns in the picture's plane, in radians per second; 0 for none. */
  spin: number;
  /** How often a particle tumbles face-on and edge-on, per second; 0 for never. */
  flutter: number;
  /** How solid the strongest particle gets, 0 to 1. Weather is meant to be felt, not watched. */
  opacity: number;
}

export interface LightTheme {
  color: string;
  intensity: number;
}

export interface SeasonTheme {
  id: SeasonId;
  label: string;
  ambient: LightTheme;
  sun: LightTheme & { position: [number, number, number] };
  platform: { rim: string; top: string };
  snowCover: boolean;
  particles: ParticleTheme;
  css: { glow: string; sun: string };
}

export const SEASON_THEMES: Record<SeasonId, SeasonTheme> = {
  winter: {
    id: "winter",
    label: "Winter",
    ambient: { color: "#bcd4f5", intensity: 1.7 },
    sun: { color: "#dce9ff", intensity: 1.6, position: [3, 5, 2] },
    platform: { rim: "#6a5648", top: "#eef4fb" },
    snowCover: true,
    particles: {
      kind: "snow",
      count: 70,
      colors: ["#ffffff", "#e6f0ff", "#d2e4ff"],
      size: 0.036,
      fall: 0.3,
      sway: 0.1,
      swayHz: 0.3,
      spin: 0,
      flutter: 0,
      opacity: 0.8,
    },
    css: { glow: "#9fc0e83a", sun: "transparent" },
  },
  spring: {
    id: "spring",
    label: "Spring",
    ambient: { color: "#f3ffe6", intensity: 1.9 },
    sun: { color: "#fff4d8", intensity: 2.6, position: [3, 5, 2] },
    platform: { rim: "#7a553c", top: "#5f9448" },
    snowCover: false,
    particles: {
      kind: "petals",
      count: 24,
      colors: ["#f8c8dc", "#ffe1ec", "#fff3f7", "#f4b3cc"],
      size: 0.085,
      fall: 0.22,
      sway: 0.28,
      swayHz: 0.45,
      spin: 0.9,
      flutter: 0.55,
      opacity: 0.75,
    },
    css: { glow: "#a7d98a30", sun: "transparent" },
  },
  summer: {
    id: "summer",
    label: "Summer",
    ambient: { color: "#fff6dc", intensity: 2.1 },
    sun: { color: "#ffe9b0", intensity: 3.3, position: [3, 6, 2] },
    platform: { rim: "#7d5a3a", top: "#6aa84f" },
    snowCover: false,
    particles: {
      kind: "motes",
      count: 24,
      colors: ["#fff2b8", "#ffe28a", "#ffd36a"],
      size: 0.075,
      fall: -0.12,
      sway: 0.14,
      swayHz: 0.25,
      spin: 0,
      flutter: 0,
      opacity: 0.7,
    },
    css: { glow: "#f6d36a30", sun: "#ffe7922e" },
  },
  autumn: {
    id: "autumn",
    label: "Autumn",
    ambient: { color: "#ffe6c4", intensity: 1.6 },
    sun: { color: "#ffc98a", intensity: 2.5, position: [3, 4, 2] },
    platform: { rim: "#6e4a30", top: "#8a5a2c" },
    snowCover: false,
    particles: {
      kind: "leaves",
      count: 22,
      colors: ["#d9822b", "#b5451b", "#e8b13a", "#8f3a14"],
      size: 0.115,
      fall: 0.27,
      sway: 0.32,
      swayHz: 0.4,
      spin: 1.2,
      flutter: 0.7,
      opacity: 0.65,
    },
    css: { glow: "#e0954240", sun: "transparent" },
  },
};
