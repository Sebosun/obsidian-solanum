import { formatTime } from "../time";

const DIGITS: Record<string, string> = {
  "0": "abcdef",
  "1": "bc",
  "2": "abged",
  "3": "abgcd",
  "4": "fgbc",
  "5": "afgcd",
  "6": "afgecd",
  "7": "abc",
  "8": "abcdefg",
  "9": "abfgcd",
};

const SEGMENTS: Record<string, [number, number, number, number]> = {
  a: [0, 0.34, 0.32, 0.022],
  b: [0.17, 0.17, 0.022, 0.3],
  c: [0.17, -0.17, 0.022, 0.3],
  d: [0, -0.34, 0.32, 0.022],
  e: [-0.17, -0.17, 0.022, 0.3],
  f: [-0.17, 0.17, 0.022, 0.3],
  g: [0, 0, 0.32, 0.022],
};

interface Segment {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Thin, font-free mesh digits. Character widths keep every preset centered. */
export function countdownSegments(remaining: number) {
  const text = formatTime(remaining);
  const widths = [...text].map((character) => (character === ":" ? 0.04 : 0.362));
  const width = widths.reduce((sum, value) => sum + value, 0) + (widths.length - 1) * 0.12;
  const segments: Segment[] = [];
  let cursor = -width / 2;
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    const center = cursor + widths[index] / 2;
    if (character === ":") {
      for (const y of [-0.13, 0.13])
        segments.push({ key: `${index}-${y}`, x: center, y, width: 0.04, height: 0.04 });
    } else {
      for (const segment of DIGITS[character]) {
        const [x, y, width, height] = SEGMENTS[segment];
        segments.push({ key: `${index}-${segment}`, x: center + x, y, width, height });
      }
    }
    cursor += widths[index] + 0.12;
  }
  const left = Math.min(...segments.map((segment) => segment.x - segment.width / 2));
  const right = Math.max(...segments.map((segment) => segment.x + segment.width / 2));
  const offset = (left + right) / 2;
  for (const segment of segments) segment.x -= offset;
  return { text, segments };
}
