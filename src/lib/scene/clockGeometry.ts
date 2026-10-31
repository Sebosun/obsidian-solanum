import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { Vector3 } from "three";
import data from "@assets/fonts/bricolage-grotesque-digits.json";
import { formatTime } from "@/lib/time";
import { CLOCK_TYPOGRAPHY } from "@/lib/scene/constants";

const CLOCK_FONT = new FontLoader().parse(data);

export function createCountdownGeometry(remaining: number, size: number): TextGeometry {
  const geometry = new TextGeometry(formatTime(remaining), {
    font: CLOCK_FONT,
    size,
    depth: CLOCK_TYPOGRAPHY.depth,
    curveSegments: CLOCK_TYPOGRAPHY.curveSegments,
    bevelEnabled: false,
  });
  geometry.computeBoundingBox();
  const center = geometry.boundingBox?.getCenter(new Vector3()) ?? new Vector3();
  geometry.translate(-center.x, -center.y, 0);
  return geometry;
}
