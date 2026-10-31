export const CROPS = {
  tomato: { name: "Tomato", model: "Tomato", emoji: "🍅" },
  carrot: { name: "Carrot", model: "Carrot", emoji: "🥕" },
  corn: { name: "Corn", model: "Corn", emoji: "🌽" },
  pumpkin: { name: "Pumpkin", model: "Pumpkin", emoji: "🎃" },
} as const;

export type CropId = keyof typeof CROPS;
export const isCropId = (value: unknown): value is CropId =>
  typeof value === "string" && Object.prototype.hasOwnProperty.call(CROPS, value);
