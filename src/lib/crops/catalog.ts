export const CROPS = {
  tomato: { name: "Tomato", model: "garden/Tomato", emoji: "🍅", produce: "garden/Tomato_produce" },
  carrot: { name: "Carrot", model: "Carrot", emoji: "🥕" },
  corn: { name: "Corn", model: "garden/Corn", emoji: "🌽", produce: "garden/Corn_produce" },
  pumpkin: { name: "Pumpkin", model: "Pumpkin", emoji: "🎃" },
  // The palm is the plant; what the overview shows is the harvest, a pile of nuts.
  coconut: { name: "Coconut", model: "Coconut", emoji: "🥥", produce: "Coconut_produce" },
  apple: { name: "Apple", model: "garden/Apple", emoji: "🍎", produce: "garden/Apple_produce" },
} as const;

export type CropId = keyof typeof CROPS;

/** Every crop, in catalog order. `Object.keys` loses the key type, so it is restored here once. */
export const CROP_IDS = Object.keys(CROPS) as CropId[];

/**
 * The picked fruit or vegetable, separate from the mature plant used by the timer.
 * Older crops without a dedicated produce asset still use their mature model.
 */
export function produceModel(crop: CropId): string | null {
  const entry = CROPS[crop];
  return "produce" in entry ? entry.produce : null;
}
export const isCropId = (value: unknown): value is CropId =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(CROPS, value);
