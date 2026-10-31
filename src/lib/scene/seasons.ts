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
  /** Point diameter in CSS pixels. */
  size: number;
  /** World units per second. Positive falls, negative rises. */
  fall: number;
  /** Sideways wobble in world units per second. */
  sway: number;
  /** Wobble cycles per second. */
  swayHz: number;
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
  /** Extra warm light source with a visible halo; only summer has one. */
  glow: (LightTheme & { position: [number, number, number]; haloColor: string }) | null;
  platform: { rim: string; top: string };
  snowCover: boolean;
  /** How strongly the harvest calendar's soil is tinted, and towards which colour. */
  groundTint: { color: string; amount: number };
  particles: ParticleTheme;
  css: { glow: string; sun: string };
}

export const SEASON_THEMES: Record<SeasonId, SeasonTheme> = {
  winter: {
    id: "winter",
    label: "Winter",
    ambient: { color: "#bcd4f5", intensity: 1.7 },
    sun: { color: "#dce9ff", intensity: 1.6, position: [3, 5, 2] },
    glow: null,
    platform: { rim: "#6a5648", top: "#eef4fb" },
    snowCover: true,
    groundTint: { color: "#eaf1fb", amount: 0.55 },
    particles: {
      kind: "snow",
      count: 90,
      colors: ["#ffffff", "#e6f0ff"],
      size: 4,
      fall: 0.32,
      sway: 0.12,
      swayHz: 0.35,
    },
    css: { glow: "#9fc0e83a", sun: "transparent" },
  },
  spring: {
    id: "spring",
    label: "Spring",
    ambient: { color: "#f3ffe6", intensity: 1.9 },
    sun: { color: "#fff4d8", intensity: 2.6, position: [3, 5, 2] },
    glow: null,
    platform: { rim: "#7a553c", top: "#5f9448" },
    snowCover: false,
    groundTint: { color: "#7fb55f", amount: 0.12 },
    particles: {
      kind: "petals",
      count: 45,
      colors: ["#f8c8dc", "#ffe1ec", "#fff3f7"],
      size: 5,
      fall: 0.2,
      sway: 0.2,
      swayHz: 0.5,
    },
    css: { glow: "#a7d98a30", sun: "transparent" },
  },
  summer: {
    id: "summer",
    label: "Summer",
    ambient: { color: "#fff6dc", intensity: 2.1 },
    sun: { color: "#ffe9b0", intensity: 3.3, position: [3, 6, 2] },
    glow: {
      color: "#ffd98a",
      intensity: 7,
      position: [1.7, 2.2, 0.6],
      haloColor: "#ffeab0",
    },
    platform: { rim: "#7d5a3a", top: "#6aa84f" },
    snowCover: false,
    groundTint: { color: "#d8b24a", amount: 0.07 },
    particles: {
      kind: "motes",
      count: 36,
      colors: ["#fff2b8", "#ffe28a"],
      size: 5,
      fall: -0.14,
      sway: 0.1,
      swayHz: 0.3,
    },
    css: { glow: "#f6d36a30", sun: "#ffe7922e" },
  },
  autumn: {
    id: "autumn",
    label: "Autumn",
    ambient: { color: "#ffe6c4", intensity: 1.6 },
    sun: { color: "#ffc98a", intensity: 2.5, position: [3, 4, 2] },
    glow: null,
    platform: { rim: "#6e4a30", top: "#8a5a2c" },
    snowCover: false,
    groundTint: { color: "#c9772e", amount: 0.1 },
    particles: {
      kind: "leaves",
      count: 38,
      colors: ["#d9822b", "#b5451b", "#e8b13a", "#8f3a14"],
      size: 6,
      fall: 0.26,
      sway: 0.25,
      swayHz: 0.45,
    },
    css: { glow: "#e0954240", sun: "transparent" },
  },
};
