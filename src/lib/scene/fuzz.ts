import { Color, ShaderMaterial, type IUniform } from "three";

/** Uniforms every shell shares, so one write dims the whole pillow. */
export interface FuzzShared {
  uBrightness: IUniform<number>;
}

export interface FuzzOptions {
  root: string;
  tip: string;
  /** Cells per unit; each cell grows one strand. */
  density: number;
  /** How far the longest strands stand off the surface. */
  length: number;
}

const VERTEX = /* glsl */ `
  uniform float uLayer;
  uniform float uLength;
  varying vec3 vObject;
  varying vec3 vNormalObject;
  varying vec3 vNormalWorld;
  void main() {
    vObject = position;
    vNormalObject = normal;
    vec3 n = normalize(normal);
    vec3 p = position + n * uLength * uLayer;
    // Fur settles: the tips sag a little under their own weight.
    p.y -= uLength * uLayer * uLayer * 0.35;
    vNormalWorld = normalize(mat3(modelMatrix) * n);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uLayer;
  uniform float uDensity;
  uniform float uBrightness;
  uniform vec3 uRoot;
  uniform vec3 uTip;
  uniform vec3 uLightDirection;
  varying vec3 vObject;
  varying vec3 vNormalObject;
  varying vec3 vNormalWorld;
  float hash(vec2 p) {
    vec3 q = fract(vec3(p.xyx) * 0.1031);
    q += dot(q, q.yzx + 33.33);
    return fract((q.x + q.y) * q.z);
  }
  void main() {
    // Strands grow on a grid laid across the surface along whichever axis it faces most, which
    // keeps them round dots instead of the bands a 3D grid cut by a curved surface would leave.
    vec3 n = abs(vNormalObject);
    vec2 plane = n.y >= n.x && n.y >= n.z ? vObject.xz : (n.x >= n.z ? vObject.zy : vObject.xy);
    vec2 scaled = plane * uDensity;
    vec2 cell = floor(scaled);
    float strand = 0.25 + 0.75 * hash(cell);
    // Each strand stands off-centre in its cell, so the pile has no visible weave.
    vec2 jitter = vec2(hash(cell + 7.3), hash(cell + 19.1)) - 0.5;
    float radius = length(fract(scaled) - 0.5 - jitter * 0.5);
    // A strand ends where its length does, and thins towards the tip.
    if (uLayer > strand || radius > 0.52 * (1.0 - uLayer * 0.6)) discard;
    float light = max(dot(normalize(vNormalWorld), normalize(uLightDirection)), 0.0);
    // Sides and the underside fall into shadow, which is what makes the cushion read as plump.
    vec3 up = normalize(vNormalWorld);
    float sky = smoothstep(-0.15, 0.85, up.y);
    float shade = (0.38 + 0.62 * light) * (0.5 + 0.5 * sky) * (0.7 + 0.3 * uLayer);
    float tone = 0.88 + 0.24 * hash(cell + 3.7);
    gl_FragColor = vec4(mix(uRoot, uTip, uLayer) * shade * tone * uBrightness, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createFuzzShared(): FuzzShared {
  return { uBrightness: { value: 1 } };
}

/**
 * One shell of fur: the surface drawn again, pushed out by `layer` (0 to 1) of the fur's length,
 * keeping only the strands tall enough to reach it. A stack of these reads as a soft pile.
 */
export function createFuzzShell(
  layer: number,
  shared: FuzzShared,
  options: FuzzOptions,
): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uLayer: { value: layer },
      uLength: { value: options.length },
      uDensity: { value: options.density },
      uRoot: { value: new Color(options.root) },
      uTip: { value: new Color(options.tip) },
      uLightDirection: { value: [0.4, 0.9, 0.5] },
      ...shared,
    },
  });
}
