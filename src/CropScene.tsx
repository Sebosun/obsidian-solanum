import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Box3, type Group } from "three";
import { cropStage } from "./crops";

function Plant({ url, moving }: { url: string; moving: boolean }) {
  const { scene } = useGLTF(url);
  const object = useMemo(() => {
    const clone = scene.clone(true);
    const box = new Box3().setFromObject(clone);
    clone.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
    return clone;
  }, [scene]);
  const group = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (group.current) group.current.rotation.z = moving ? Math.sin(clock.elapsedTime * 1.3) * .025 : 0;
  });
  return <group ref={group} position={[0, -.55, 0]} scale={1.05}><primitive object={object} dispose={null} /></group>;
}

function Fallback({ progress }: { progress: number }) {
  return <div className="solanum-crop-fallback sol:h-full sol:flex sol:flex-col sol:gap-3.5 sol:justify-center sol:items-center sol:text-(--text-muted)" role="img" aria-label={`Tomato crop ${Math.round(progress * 100)}% grown`}>
    <span aria-hidden="true">{progress >= 1 ? "🍅" : progress > .2 ? "🌱" : "🫘"}</span>
    <small>{progress >= 1 ? "Ready to harvest" : "Good things take focus"}</small>
  </div>;
}

class SceneBoundary extends Component<{ children: ReactNode; progress: number }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <Fallback progress={this.props.progress} /> : this.props.children; }
}

export function CropScene({ progress, running, assetUrl }: {
  progress: number; running: boolean; assetUrl: (name: string) => string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (container.current) observer.observe(container.current);
    return () => { media.removeEventListener("change", update); observer.disconnect(); };
  }, []);
  const stage = cropStage(progress);
  const moving = running && visible && !reduced;
  return <div ref={container} className={`solanum-scene ${progress >= 1 ? "is-mature" : ""}`}>
    <SceneBoundary progress={progress}>
      <Suspense fallback={<Fallback progress={progress} />}>
        <Canvas camera={{ position: [3.2, 2.3, 3.6], fov: 36 }} dpr={[1, 1.5]}
          frameloop={moving ? "always" : "demand"} fallback={<Fallback progress={progress} />}
          onCreated={({ camera }) => camera.lookAt(0, .15, 0)} aria-label="Growing tomato crop">
          <ambientLight intensity={1.8} />
          <directionalLight position={[3, 5, 2]} intensity={3} color="#fff0ce" />
          <mesh position={[0, -.68, 0]}><cylinderGeometry args={[.95, .8, .25, 8]} /><meshStandardMaterial color="#77513a" roughness={1} /></mesh>
          <mesh position={[0, -.54, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[.9, 8]} /><meshStandardMaterial color="#493324" /></mesh>
          {stage > 0 ? <Plant key={stage} url={assetUrl(`Tomato_${stage}.glb`)} moving={moving} />
            : <mesh position={[0, -.48, 0]} scale={[1, .55, .7]}><sphereGeometry args={[.09, 12, 8]} /><meshStandardMaterial color="#e8bb77" /></mesh>}
        </Canvas>
      </Suspense>
    </SceneBoundary>
    <span className="solanum-scene-caption">{progress >= 1 ? "A little focus. A lovely harvest." : stage === 0 ? "Plant your next good intention." : "Your focus is taking root."}</span>
  </div>;
}
