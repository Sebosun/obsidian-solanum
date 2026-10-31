import { useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import type { Group } from "three";
import type { HarvestDay } from "@/lib/harvest/model";
import { cropStage } from "@/lib/crops/growth";
import { Color } from "three";
import { HARVEST_GRID } from "@/lib/scene/constants";
import { plotEntrance } from "@/lib/scene/motion";
import { SEASON_THEMES, type SeasonId } from "@/lib/scene/seasons";
import { Plant } from "@/components/scene/Plant";

interface HarvestDayPlotProps {
  day: HarvestDay;
  hovered: boolean;
  selected: boolean;
  season: SeasonId;
  /** Position in the month; later plots rise a beat after earlier ones. */
  index: number;
  reduced: boolean;
  onHover(key: string | null): void;
  onSelect(key: string): void;
}

const MAX_STEP_SECONDS = 0.05;
const MIN_SCALE = 0.0001;
const BASE_HEIGHT = 0.14;
const SOIL_INSET = 0.12;
const SOIL_HEIGHT = 0.2;
const HOVER_LIFT = 0.05;
const LABEL_CORNER = 0.44;
const BASE_COLOR = {
  empty: "#4a4b3f",
  harvested: "#4a3a2a",
  selected: "#87a879",
  hovered: "#b79b6a",
};
const SOIL_COLOR = { empty: "#58594b", light: "#7b5b3d", rich: "#936a43" };
/** Focused minutes per day at which the soil switches to its richest shade. */
const RICH_SOIL_MINUTES = 100;

/** Blends a colour towards the season's ground tint, e.g. snow in winter. */
function seasonal(hex: string, season: SeasonId): string {
  const { color, amount } = SEASON_THEMES[season].groundTint;
  return `#${new Color(hex).lerp(new Color(color), amount).getHexString()}`;
}

function soilColor(day: HarvestDay, season: SeasonId): string {
  if (day.items.length === 0) return seasonal(SOIL_COLOR.empty, season);
  if (day.minutes >= RICH_SOIL_MINUTES) return seasonal(SOIL_COLOR.rich, season);
  return seasonal(SOIL_COLOR.light, season);
}

function baseColor(day: HarvestDay, hovered: boolean, selected: boolean, season: SeasonId) {
  if (selected) return BASE_COLOR.selected;
  if (hovered) return BASE_COLOR.hovered;
  if (day.items.length === 0) return seasonal(BASE_COLOR.empty, season);
  return seasonal(BASE_COLOR.harvested, season);
}

export function HarvestDayPlot({
  day,
  hovered,
  selected,
  season,
  index,
  reduced,
  onHover,
  onSelect,
}: HarvestDayPlotProps) {
  const lift = hovered || selected ? HOVER_LIFT : 0;
  const group = useRef<Group>(null);
  const age = useRef(0);
  const settled = useRef(reduced);
  const invalidate = useThree((state) => state.invalidate);
  useFrame((_state, delta) => {
    if (settled.current || !group.current) return;
    age.current += Math.min(delta, MAX_STEP_SECONDS);
    const frame = plotEntrance(age.current, index, reduced);
    group.current.scale.setScalar(Math.max(MIN_SCALE, frame.scale));
    settled.current = frame.done;
    invalidate();
  });
  const soilSize = HARVEST_GRID.plotSize - SOIL_INSET;
  let labelClass = "solanum-plot-date";
  if (selected) labelClass += " is-selected";
  else if (hovered) labelClass += " is-hovered";
  function hover(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    onHover(day.key);
  }
  function leave(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    onHover(null);
  }
  function select(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    onSelect(day.key);
  }
  return (
    <group
      ref={group}
      scale={reduced ? 1 : MIN_SCALE}
      position={[day.position[0], lift, day.position[2]]}
      name={`day-${day.key}`}
      onPointerOver={hover}
      onPointerOut={leave}
      onClick={select}
    >
      <mesh name={`base-${day.key}`}>
        <boxGeometry args={[HARVEST_GRID.plotSize, BASE_HEIGHT, HARVEST_GRID.plotSize]} />
        <meshStandardMaterial color={baseColor(day, hovered, selected, season)} roughness={1} />
      </mesh>
      <mesh name={`soil-${day.key}`} position={[0, (SOIL_HEIGHT - BASE_HEIGHT) / 2, 0]}>
        <boxGeometry args={[soilSize, SOIL_HEIGHT, soilSize]} />
        <meshStandardMaterial color={soilColor(day, season)} roughness={1} />
      </mesh>
      {day.items.map((item) => (
        <group key={item.key} position={item.position}>
          <Plant
            crop={item.session.crop}
            stage={Math.max(1, cropStage(item.progress))}
            scale={0.19 + 0.06 * item.progress}
          />
        </group>
      ))}
      <Html
        position={[-LABEL_CORNER, SOIL_HEIGHT / 2, -LABEL_CORNER]}
        style={{ pointerEvents: "none" }}
        zIndexRange={[5, 0]}
      >
        <span className={labelClass}>
          {day.date.getDate()}
          {day.overflow > 0 && <small>+{day.overflow}</small>}
        </span>
      </Html>
    </group>
  );
}
