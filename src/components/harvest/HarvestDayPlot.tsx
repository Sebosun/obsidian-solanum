import { Html } from "@react-three/drei";
import type { HarvestDay } from "../../lib/harvest/model";
import { cropStage } from "../../lib/crops/growth";
import { Plant } from "../scene/Plant";

export function HarvestDayPlot({
  day,
  active,
  assetUrl,
  onHover,
  onSelect,
}: {
  day: HarvestDay;
  active: boolean;
  assetUrl: (name: string) => string;
  onHover: (key: string | null) => void;
  onSelect: (key: string) => void;
}) {
  return (
    <group
      position={day.position}
      name={`day-${day.key}`}
      onPointerOver={(event) => {
        event.stopPropagation();
        onHover(day.key);
      }}
      onPointerOut={(event) => {
        event.stopPropagation();
        onHover(null);
      }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(day.key);
      }}
    >
      <mesh name={`soil-${day.key}`}>
        <boxGeometry args={[1.15, 0.16, 1.15]} />
        <meshStandardMaterial
          color={active ? "#a1bb79" : day.items.length ? "#765538" : "#514536"}
          roughness={1}
        />
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
