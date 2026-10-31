export const CROPS = {
  tomato: { name: "Tomato", model: "Tomato", emoji: "🍅" },
  carrot: { name: "Carrot", model: "Carrot", emoji: "🥕" },
  corn: { name: "Corn", model: "Corn", emoji: "🌽" },
  pumpkin: { name: "Pumpkin", model: "Pumpkin", emoji: "🎃" },
  // The palm is the plant; what the overview shows is the harvest, a pile of nuts.
  coconut: { name: "Coconut", model: "Coconut", emoji: "🥥", produce: "Coconut_produce" },
} as const;

export type CropId = keyof typeof CROPS;

/**
 * The model of what a crop yields, for crops whose plant is not the thing you harvest (a coconut
 * palm). Crops without one are shown as their mature plant, which carries its fruit.
 */
export function produceModel(crop: CropId): string | null {
  const entry = CROPS[crop];
  return "produce" in entry ? entry.produce : null;
}
export const isCropId = (value: unknown): value is CropId =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(CROPS, value);
