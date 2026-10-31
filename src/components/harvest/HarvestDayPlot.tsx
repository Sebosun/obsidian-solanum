import { Html } from "@react-three/drei";
import type { HarvestDay } from "../../lib/harvest/model";
import { cropStage } from "../../lib/crops/growth";
import { Plant } from "../scene/Plant";
import type { ThreeEvent } from "@react-three/fiber";

interface HarvestDayPlotProps {
  day: HarvestDay;
  active: boolean;
  assetUrl(name: string): string;
  onHover(key: string | null): void;
  onSelect(key: string): void;
}

export function HarvestDayPlot({ day, active, assetUrl, onHover, onSelect }: HarvestDayPlotProps) {
  let soilColor = "#514536";
  if (day.items.length > 0) soilColor = "#765538";
  if (active) soilColor = "#a1bb79";
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
      position={day.position}
      name={`day-${day.key}`}
      onPointerOver={hover}
      onPointerOut={leave}
      onClick={select}
    >
      <mesh name={`soil-${day.key}`}>
        <boxGeometry args={[1.15, 0.16, 1.15]} />
        <meshStandardMaterial color={soilColor} roughness={1} />
      </mesh>
      {day.items.map((item) => (
        <group key={item.key} position={item.position}>
          <Plant
            crop={item.session.crop}
            stage={Math.max(1, cropStage(item.progress))}
            scale={0.19 + 0.06 * item.progress}
            assetUrl={assetUrl}
          />
        </group>
      ))}
      <Html
        center
        position={[0, 0.08, 0.67]}
        style={{ pointerEvents: "none" }}
        zIndexRange={[5, 0]}
      >
        <span className="solanum-plot-date">
          {day.date.getDate()}
          {day.overflow > 0 && <small> +{day.overflow}</small>}
        </span>
      </Html>
    </group>
  );
}
