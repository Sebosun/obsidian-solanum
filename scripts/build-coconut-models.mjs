// Builds the Coconut models: the growth stages assets/crops/Coconut_1.glb to Coconut_4.glb, and
// Coconut_produce.glb, the harvest (a small pile of nuts) that the overview shows instead of the palm.
//
//   node scripts/build-coconut-models.mjs [output directory]
//
// The models are original work for Solanum, made entirely from code (no source art), so they are
// reproducible: the same script always writes the same files. Low poly and flat shaded, with the
// colour carried by vertex colours so the whole plant is one mesh and one material.
import { mkdir, writeFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";

// GLTFExporter reads its binary through FileReader, which Node does not have.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      this.onloadend?.();
    });
  }
};

const OUTPUT = process.argv[2] ?? "assets/crops";

/** A small seeded random generator, so every build is identical. */
function random(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PALETTE = {
  barkLight: "#a98259",
  barkDark: "#7d5c3a",
  huskBrown: "#7a5232",
  huskDark: "#5a3b24",
  nutGreen: "#8fb04a",
  nutYellow: "#c2b556",
  shoot: "#b4d062",
  leafSpine: "#a3d05a",
  leafEdge: "#3d8a3c",
  leafEdgeDark: "#2c6e35",
};
const color = (hex) => new THREE.Color(hex);
const mix = (a, b, k) => color(a).lerp(color(b), k);

/** A triangle soup with a colour per vertex; each triangle is flat shaded. */
class Soup {
  constructor() {
    this.positions = [];
    this.colors = [];
  }
  triangle(a, b, c, colorA, colorB = colorA, colorC = colorA) {
    for (const [point, tint] of [
      [a, colorA],
      [b, colorB],
      [c, colorC],
    ]) {
      this.positions.push(point.x, point.y, point.z);
      this.colors.push(tint.r, tint.g, tint.b);
    }
  }
  /** A quad a-b-c-d (in order around it) as two triangles of one colour. */
  quad(a, b, c, d, tint) {
    this.triangle(a, b, c, tint);
    this.triangle(a, c, d, tint);
  }
  geometry() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(this.colors, 3));
    geometry.computeVertexNormals();
    return geometry;
  }
  /** Adds another soup's triangles, moved by `matrix`. */
  append(other, matrix) {
    const point = new THREE.Vector3();
    for (let i = 0; i < other.positions.length; i += 3) {
      point.set(other.positions[i], other.positions[i + 1], other.positions[i + 2]);
      point.applyMatrix4(matrix);
      this.positions.push(point.x, point.y, point.z);
    }
    this.colors.push(...other.colors);
  }
}

const vec = (x, y, z) => new THREE.Vector3(x, y, z);

/**
 * One palm frond lying along +X, in the XY plane: a spine that rises and then droops, with a
 * zigzag of leaflets folded down on both sides.
 */
function frond({ length, width, lift, droop, segments = 7, tone = 0 }) {
  const soup = new Soup();
  const spineAt = (t) => vec(length * t, lift * length * t - droop * length * t * t, 0);
  const halfWidth = (t) => width * Math.sin(Math.PI * Math.pow(Math.min(1, Math.max(0, t)), 0.7));
  const fold = 0.5;
  const edge = (t, side, scale) => {
    const spine = spineAt(t);
    const w = halfWidth(t) * scale;
    return vec(spine.x + 0.04 * length * scale, spine.y - w * fold, side * w);
  };
  const spineColor = mix(PALETTE.leafSpine, "#d6e27a", tone * 0.4);
  const edgeColor = mix(PALETTE.leafEdge, PALETTE.leafEdgeDark, tone);
  const valleyColor = mix(PALETTE.leafEdge, PALETTE.leafSpine, 0.45);
  for (let i = 0; i < segments; i += 1) {
    const t0 = i / segments;
    const t1 = (i + 1) / segments;
    const tm = (i + 0.55) / segments;
    for (const side of [1, -1]) {
      const s0 = spineAt(t0);
      const s1 = spineAt(t1);
      const v0 = edge(t0, side, 0.45);
      const tip = edge(tm, side, 1);
      const v1 = edge(t1, side, 0.45);
      const flip = side === 1;
      const emit = (a, b, c, ca, cb, cc) =>
        flip ? soup.triangle(a, b, c, ca, cb, cc) : soup.triangle(a, c, b, ca, cc, cb);
      emit(s0, v0, tip, spineColor, valleyColor, edgeColor);
      emit(s0, tip, s1, spineColor, edgeColor, spineColor);
      emit(s1, tip, v1, spineColor, edgeColor, valleyColor);
    }
  }
  return soup;
}

/** A tapering, slightly curved trunk with bands of alternating bark, as a ring of flat quads. */
function trunk({ height, lean, radius, rings = 9, sides = 7, tip = 0.5 }) {
  const soup = new Soup();
  const curve = new THREE.QuadraticBezierCurve3(
    vec(0, 0, 0),
    vec(lean * 0.15, height * 0.55, 0),
    vec(lean, height, 0),
  );
  const frames = [];
  for (let i = 0; i <= rings; i += 1) {
    const t = i / rings;
    const centre = curve.getPoint(t);
    const tangent = curve.getTangent(t);
    const across = new THREE.Vector3().crossVectors(tangent, vec(0, 0, 1)).normalize();
    const depth = new THREE.Vector3().crossVectors(tangent, across).normalize();
    const flare = 1 + Math.max(0, 0.16 - t) * 3.2;
    const notch = i % 2 === 0 ? 1 : 0.9;
    const r = radius * (1 - (1 - tip) * t) * flare * notch;
    const ring = [];
    for (let s = 0; s < sides; s += 1) {
      const angle = (s / sides) * Math.PI * 2;
      ring.push(
        centre
          .clone()
          .addScaledVector(across, Math.cos(angle) * r)
          .addScaledVector(depth, Math.sin(angle) * r),
      );
    }
    frames.push({ centre, ring });
  }
  for (let i = 0; i < rings; i += 1) {
    const band = mix(
      i % 2 === 0 ? PALETTE.barkLight : PALETTE.barkDark,
      "#b99466",
      (i / rings) * 0.35,
    );
    for (let s = 0; s < sides; s += 1) {
      const n = (s + 1) % sides;
      const shade = s % 2 === 0 ? 1 : 0.94;
      const tint = band.clone().multiplyScalar(shade);
      soup.quad(
        frames[i].ring[s],
        frames[i].ring[n],
        frames[i + 1].ring[n],
        frames[i + 1].ring[s],
        tint,
      );
    }
  }
  const top = frames[rings];
  const cap = mix(PALETTE.barkDark, "#3d2a18", 0.4);
  for (let s = 0; s < sides; s += 1)
    soup.triangle(top.centre, top.ring[(s + 1) % sides], top.ring[s], cap);
  return { soup, top: curve.getPoint(1) };
}

/** A faceted coconut: an icosphere, a little taller than wide, each facet tinted a touch differently. */
function nut({ radius, base, seed }) {
  const next = random(seed);
  const ico = new THREE.IcosahedronGeometry(radius, 1);
  ico.scale(1, 1.12, 1);
  const soup = new Soup();
  const position = ico.getAttribute("position");
  for (let i = 0; i < position.count; i += 3) {
    const tint = color(base).multiplyScalar(0.86 + next() * 0.28);
    const a = vec(position.getX(i), position.getY(i), position.getZ(i));
    const b = vec(position.getX(i + 1), position.getY(i + 1), position.getZ(i + 1));
    const c = vec(position.getX(i + 2), position.getY(i + 2), position.getZ(i + 2));
    soup.triangle(a, b, c, tint);
  }
  return soup;
}

/** A coconut cut in half: a husk bowl with the white flesh showing across its flat top. */
function halfNut({ radius, seed }) {
  const next = random(seed);
  const ico = new THREE.IcosahedronGeometry(radius, 1);
  ico.scale(1, 1.12, 1);
  const soup = new Soup();
  const position = ico.getAttribute("position");
  const flesh = color("#efe8d0");
  const rim = color("#d9cfae");
  for (let i = 0; i < position.count; i += 3) {
    const points = [0, 1, 2].map((k) =>
      vec(position.getX(i + k), position.getY(i + k), position.getZ(i + k)),
    );
    // Cut: nothing stays above the middle, so the top becomes a flat face.
    const flat = points.every((point) => point.y >= -1e-6);
    const clamped = points.map((point) => vec(point.x, Math.min(point.y, 0), point.z));
    if (points.every((point) => point.y > 1e-6)) {
      soup.triangle(clamped[0], clamped[1], clamped[2], flesh);
    } else if (flat) {
      soup.triangle(clamped[0], clamped[1], clamped[2], rim);
    } else {
      const tint = color(PALETTE.huskBrown).multiplyScalar(0.86 + next() * 0.28);
      soup.triangle(clamped[0], clamped[1], clamped[2], tint);
    }
  }
  return soup;
}

/** The harvest: a few coconuts heaped together, one of them halved and turned to show its flesh. */
function produce() {
  const soup = new Soup();
  const r = 0.17;
  place(nut({ radius: r, base: PALETTE.huskBrown, seed: 201 }), soup, {
    position: vec(-0.2, r * 1.12, 0.02),
    yaw: 0.5,
  });
  place(nut({ radius: r, base: PALETTE.nutGreen, seed: 202 }), soup, {
    position: vec(0.2, r * 1.12, -0.04),
    yaw: 1.3,
  });
  place(nut({ radius: r, base: PALETTE.huskBrown, seed: 203 }), soup, {
    position: vec(0.0, r * 1.12 * 2.05, -0.12),
    yaw: 2.2,
  });
  // The half rests on the ground in front, tipped up towards the camera (+x, +z).
  place(halfNut({ radius: r, seed: 204 }), soup, {
    position: vec(0.1, r * 0.95, 0.3),
    yaw: -FACING,
    pitch: 0,
    roll: -0.95,
  });
  return soup;
}

/** A thin curved shoot, for the sprouting nut. */
function shoot({ height, lean, radius }) {
  const result = trunk({ height, lean, radius, rings: 4, sides: 5, tip: 0.55 });
  const recoloured = new Soup();
  const shade = color(PALETTE.shoot);
  recoloured.positions = result.soup.positions;
  recoloured.colors = result.soup.colors.map((_, i) => shade.toArray()[i % 3]);
  return { soup: recoloured, top: result.top };
}

function place(soup, target, { position, yaw = 0, pitch = 0, roll = 0, scale = 1 }) {
  const matrix = new THREE.Matrix4().compose(
    position,
    new THREE.Quaternion().setFromEuler(new THREE.Euler(roll, yaw, pitch, "YZX")),
    vec(scale, scale, scale),
  );
  target.append(soup, matrix);
}

/** The side the scenes are viewed from: the direction of the camera, seen from above. */
const FACING = Math.atan2(4, 3);

/**
 * Fronds in a ring around `point`, upper ones more upright and lower ones drooping. The ring
 * leaves a gap `gap` radians wide on the side the camera looks from, so the nuts can be seen.
 */
function crown(target, point, { count, length, width, seed, lift = 0.5, droop = 0.9, gap = 0 }) {
  const next = random(seed);
  for (let k = 0; k < count; k += 1) {
    const upper = k % 2 === 0;
    const size = length * (0.88 + next() * 0.22);
    const piece = frond({
      length: size,
      width: width * (size / length),
      lift: upper ? lift + 0.25 : lift - 0.1,
      droop: upper ? droop * 0.85 : droop * 1.15,
      tone: next(),
    });
    // A frond points along atan2(z, x) = -yaw. Spread them over everything but the gap.
    const around = FACING + gap / 2 + ((k + 0.5) / count) * (Math.PI * 2 - gap);
    place(piece, target, {
      position: point,
      yaw: -(around + (next() - 0.5) * 0.2),
      roll: (next() - 0.5) * 0.25,
    });
  }
}

/** Coconuts hanging from the crown on the side the camera looks from, in the crown's gap. */
function nutCluster(target, point, radius, seed, spread) {
  const next = random(seed);
  const tones = [
    PALETTE.nutGreen,
    PALETTE.huskBrown,
    PALETTE.nutGreen,
    PALETTE.nutYellow,
    PALETTE.huskBrown,
  ];
  tones.forEach((tone, i) => {
    const angle = FACING + (i / (tones.length - 1) - 0.5) * spread + (next() - 0.5) * 0.15;
    const hang = radius * (1.4 + (i % 2) * 0.9 + next() * 0.4);
    const reach = radius * (1.5 + (i % 2) * 0.4);
    place(nut({ radius, base: tone, seed: 100 + i }), target, {
      position: point.clone().add(vec(Math.cos(angle) * reach, -hang, Math.sin(angle) * reach)),
      yaw: next() * 6,
    });
  });
}

/** The growth stages, from a sprouting nut to a palm heavy with coconuts. */
const STAGES = {
  produce,
  1() {
    const soup = new Soup();
    place(nut({ radius: 0.17, base: PALETTE.huskBrown, seed: 1 }), soup, {
      position: vec(0, 0.19, 0),
    });
    const sprout = shoot({ height: 0.34, lean: 0.07, radius: 0.028 });
    place(sprout.soup, soup, { position: vec(0.0, 0.3, 0.02) });
    const top = sprout.top.clone().add(vec(0, 0.3, 0.02));
    crown(soup, top, { count: 3, length: 0.2, width: 0.045, seed: 11, lift: 0.9, droop: 0.9 });
    return soup;
  },
  2() {
    const soup = new Soup();
    place(nut({ radius: 0.17, base: PALETTE.huskBrown, seed: 2 }), soup, {
      position: vec(-0.04, 0.17, 0.03),
    });
    const sprout = shoot({ height: 0.55, lean: 0.12, radius: 0.04 });
    place(sprout.soup, soup, { position: vec(0.04, 0.27, 0) });
    const top = sprout.top.clone().add(vec(0.04, 0.27, 0));
    crown(soup, top, { count: 5, length: 0.46, width: 0.09, seed: 21, lift: 0.8, droop: 1.0 });
    return soup;
  },
  3() {
    const soup = new Soup();
    const stem = trunk({ height: 0.95, lean: 0.24, radius: 0.075, rings: 7, tip: 0.55 });
    place(stem.soup, soup, { position: vec(0, 0, 0) });
    crown(soup, stem.top, {
      count: 7,
      length: 0.82,
      width: 0.16,
      seed: 31,
      lift: 0.7,
      droop: 1.0,
      gap: 1.1,
    });
    nutCluster(soup, stem.top, 0.06, 33, 0.9);
    return soup;
  },
  4() {
    const soup = new Soup();
    const stem = trunk({ height: 1.5, lean: 0.42, radius: 0.12, rings: 11, sides: 8, tip: 0.5 });
    place(stem.soup, soup, { position: vec(0, 0, 0) });
    crown(soup, stem.top, {
      count: 11,
      length: 1.2,
      width: 0.26,
      seed: 41,
      lift: 0.58,
      droop: 1.15,
      gap: 1.5,
    });
    nutCluster(soup, stem.top, 0.14, 43, 1.2);
    return soup;
  },
};

async function exportStage(stage) {
  const geometry = STAGES[stage]().geometry();
  const material = new THREE.MeshStandardMaterial({
    name: "Coconut",
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.62,
    metalness: 0.1,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `Coconut_${stage}`;
  const scene = new THREE.Scene();
  scene.add(mesh);
  const bytes = await new GLTFExporter().parseAsync(scene, { binary: true });
  return Buffer.from(bytes);
}

await mkdir(OUTPUT, { recursive: true });
for (const stage of [1, 2, 3, 4, "produce"]) {
  const bytes = await exportStage(stage);
  await writeFile(`${OUTPUT}/Coconut_${stage}.glb`, bytes);
  console.log(`Coconut_${stage}.glb`, bytes.length, "bytes");
}
