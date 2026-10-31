import { AdditiveBlending, NormalBlending, ShaderMaterial } from "three";
import type { ParticleKind } from "@/lib/scene/seasons";

/**
 * How much bigger than the particle the sprite is drawn, so that what is drawn inside it, such as
 * a turning leaf or a glow, never meets the edge of the square.
 */
const SPRITE_SCALE: Record<ParticleKind, number> = {
  snow: 1.6,
  petals: 1.7,
  leaves: 1.8,
  motes: 2.6,
};

const VERTEX = /* glsl */ `
  attribute vec3 aColor;
  attribute float aAlpha;
  attribute vec2 aRotation;
  attribute float aSize;
  uniform float uPixelsPerUnit;
  uniform float uSpriteScale;
  varying vec3 vColor;
  varying float vAlpha;
  varying vec2 vRotation;
  varying float vPixels;
  void main() {
    vColor = aColor;
    vAlpha = aAlpha;
    vRotation = aRotation;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPixelsPerUnit * uSpriteScale;
    vPixels = gl_PointSize;
  }
`;

/** Shared by every kind: the point's own coordinates, from -1 to 1, and a turn of them. */
const COMMON = /* glsl */ `
  uniform float uTime;
  varying vec3 vColor;
  varying float vAlpha;
  varying vec2 vRotation;
  varying float vPixels;
  vec2 turn(vec2 p, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
  }
`;

/**
 * Snow: small flakes are crisp, with six faint arms; the biggest, which are the nearest, are out of
 * focus, so they turn into soft, faint glows. Together that gives the fall some depth.
 */
const SNOW = /* glsl */ `
  void main() {
    vec2 p = turn((gl_PointCoord - 0.5) * 2.0, vRotation.x);
    float d = length(p);
    float blur = smoothstep(16.0, 34.0, vPixels);
    float crisp = smoothstep(0.34, 0.2, d);
    float arms = pow(abs(cos(atan(p.y, p.x) * 3.0)), 28.0) * smoothstep(0.7, 0.05, d) * 0.55;
    float soft = exp(-d * d * 4.5) * 0.7;
    float body = mix(crisp + arms * (1.0 - smoothstep(0.0, 0.5, blur)), soft, blur);
    float halo = smoothstep(1.0, 0.1, d) * 0.12;
    gl_FragColor = vec4(vColor, (body + halo) * mix(1.0, 0.55, blur) * vAlpha);
  }
`;

/**
 * A petal: a teardrop, fuller at the base and drawn to a point, turning in the plane and flipping
 * face-on to edge-on as it tumbles, lit lighter at its edge.
 */
const PETALS = /* glsl */ `
  void main() {
    vec2 p = turn((gl_PointCoord - 0.5) * 2.0, vRotation.x);
    // Seen edge-on a petal is a thin sliver: squash it across, but never to nothing.
    p.x /= max(abs(vRotation.y), 0.18);
    float t = p.y * 0.5 + 0.5;
    float width = 0.34 * pow(max(sin(3.14159 * t), 0.0), 0.85) * (1.0 - 0.3 * t);
    float inside = smoothstep(width, width - 0.07, abs(p.x)) * step(0.0, t) * step(t, 1.0);
    float rim = smoothstep(width * 0.55, width, abs(p.x));
    float shade = 0.94 + 0.16 * abs(vRotation.y) + 0.1 * rim;
    gl_FragColor = vec4(vColor * shade, inside * vAlpha);
  }
`;

/**
 * A leaf: an oval drawn to a point with a stalk, a darker midrib and veins, a slightly serrated
 * edge, turning in the plane and tumbling face-on to edge-on.
 */
const LEAVES = /* glsl */ `
  void main() {
    vec2 p = turn((gl_PointCoord - 0.5) * 2.0, vRotation.x);
    p.x /= max(abs(vRotation.y), 0.16);
    float t = p.y * 0.5 + 0.5;
    float serration = 1.0 + 0.09 * sin(t * 46.0);
    float width = 0.4 * pow(max(sin(3.14159 * t), 0.0), 0.9) * (1.0 - 0.32 * t) * serration;
    float blade = smoothstep(width, width - 0.06, abs(p.x)) * step(0.0, t) * step(t, 1.0);
    // The stalk, a short thin tail below the blade.
    float stalk = smoothstep(0.045, 0.02, abs(p.x)) * step(-0.12, t) * step(t, 0.02);
    float midrib = smoothstep(0.05, 0.015, abs(p.x)) * step(0.02, t);
    float veins = smoothstep(0.07, 0.02, abs(fract(t * 6.0 - abs(p.x) * 2.6) - 0.5) - 0.38) * step(0.1, t);
    float shade = (0.78 + 0.32 * abs(vRotation.y)) * (1.0 - 0.28 * midrib - 0.12 * veins);
    vec3 colour = mix(vColor, vec3(0.32, 0.13, 0.05), stalk * 0.7);
    gl_FragColor = vec4(colour * shade, max(blade, stalk) * vAlpha);
  }
`;

/** Sunlit motes: a warm glow with a four-point sparkle, each twinkling in its own time. */
const MOTES = /* glsl */ `
  void main() {
    vec2 p = (gl_PointCoord - 0.5) * 2.0;
    float d = length(p);
    float glow = exp(-d * d * 7.0);
    float cross = exp(-abs(p.x) * 24.0) * exp(-abs(p.y) * 3.2) + exp(-abs(p.y) * 24.0) * exp(-abs(p.x) * 3.2);
    // vRotation.x is a fixed phase for these, so each mote twinkles on its own.
    float twinkle = 0.55 + 0.45 * sin(uTime * 1.6 + vRotation.x * 3.0);
    float alpha = (glow * 0.8 + cross * 0.7) * twinkle * vAlpha;
    gl_FragColor = vec4(vColor * (1.0 + 0.4 * cross), alpha);
  }
`;

const FRAGMENTS: Record<ParticleKind, string> = {
  snow: SNOW,
  petals: PETALS,
  leaves: LEAVES,
  motes: MOTES,
};

/** What each kind of weather draws is the whole point of it, so each has its own shader. */
export function createWeatherMaterial(kind: ParticleKind): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: `${COMMON}${FRAGMENTS[kind]}`.replace(
      /\}\s*$/,
      "  #include <colorspace_fragment>\n}",
    ),
    uniforms: {
      uTime: { value: 0 },
      uPixelsPerUnit: { value: 200 },
      uSpriteScale: { value: SPRITE_SCALE[kind] },
    },
    transparent: true,
    depthWrite: false,
    // Light adds up: sunlit motes glow into one another, while the rest sit over the picture.
    blending: kind === "motes" ? AdditiveBlending : NormalBlending,
    // The colours are as they should look; the scene's tone mapping would wash them out.
    toneMapped: false,
  });
}
