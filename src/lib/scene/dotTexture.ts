import { CanvasTexture } from "three";

const SIZE_PX = 32;

/** A soft round sprite for point particles; null where no 2D canvas exists (tests, SSR). */
export function createDotTexture(): CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE_PX;
  canvas.height = SIZE_PX;
  const context = canvas.getContext("2d");
  if (!context) return null;
  const centre = SIZE_PX / 2;
  const gradient = context.createRadialGradient(centre, centre, 0, centre, centre, centre);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.55, "rgba(255,255,255,0.9)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, SIZE_PX, SIZE_PX);
  return new CanvasTexture(canvas);
}
