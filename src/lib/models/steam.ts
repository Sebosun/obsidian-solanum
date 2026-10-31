import { NormalBlending, ShaderMaterial } from "three";
import { BREAK_SCENE } from "@/lib/scene/constants";

const VERTEX = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uHeight;
  uniform float uTurns;
  uniform float uRiseSeconds;
  uniform float uSize;
  uniform float uPixelsPerUnit;
  varying float vAlpha;
  void main() {
    // Each puff rises on its own schedule, turning round the mug's axis as it goes and spreading out.
    float life = fract(uTime / uRiseSeconds + aSeed);
    float angle = aSeed * 6.2831853 + life * uTurns * 6.2831853;
    float radius = 0.018 + life * 0.075;
    vec3 p = vec3(cos(angle) * radius, life * uHeight, sin(angle) * radius);
    vAlpha = smoothstep(0.0, 0.14, life) * (1.0 - smoothstep(0.5, 1.0, life)) * 0.55;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * uPixelsPerUnit * (0.55 + life * 1.3);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float soft = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(uColor, soft * soft * vAlpha);
  }
`;

/** Where in its rise a still, reduced-motion plume is frozen: well into its climb. */
export const STILL_STEAM_SECONDS = 2.6;

/** Seeds that spread the puffs evenly through their cycle, with a little irregularity. */
export function steamSeeds(count: number): Float32Array {
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i += 1) seeds[i] = (i + 0.5 * Math.sin(i * 12.9898)) / count;
  return seeds;
}

export function createSteamMaterial(): ShaderMaterial {
  const { height, turns, riseSeconds, size } = BREAK_SCENE.steam;
  return new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: NormalBlending,
    uniforms: {
      uTime: { value: 0 },
      uHeight: { value: height },
      uTurns: { value: turns },
      uRiseSeconds: { value: riseSeconds },
      uSize: { value: size },
      uPixelsPerUnit: { value: 200 },
      uColor: { value: [0.97, 0.95, 0.92] },
    },
  });
}
