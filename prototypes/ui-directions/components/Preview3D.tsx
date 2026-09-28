"use client";
// PROTOTYPE JETABLE — aperçu 3D simplifié : dalle + murets en boîtes, aimants et vis en cylindres.
// Aucune vraie géométrie Gridfinity ici ; c'est un décor pour juger la mise en page.
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, RoundedBox } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import type { Layout, Settings } from "@/lib/settings";

export type PreviewPalette = {
  plate: string;
  wall?: string;
  magnet: string;
  screw: string;
  margin?: string;
};

const WALL = 2.6;

function Plate({ s, l, pal }: { s: Settings; l: Layout; pal: PreviewPalette }) {
  const c = s.cellSize;
  const H = s.profile === "hybrid" ? 4.6 : 4.25;
  const base = s.magnets ? 2.8 : 0.8;
  const x0 = -l.width / 2 + l.marginLeft;
  const z0 = -l.depth / 2 + l.marginBack;
  const gw = l.nx * c;
  const gd = l.ny * c;

  const walls = useMemo(() => {
    const out: { x: number; z: number; w: number; d: number }[] = [];
    for (let i = 0; i <= l.nx; i++) out.push({ x: x0 + i * c, z: z0 + gd / 2, w: WALL, d: gd + WALL });
    for (let j = 0; j <= l.ny; j++) out.push({ x: x0 + gw / 2, z: z0 + j * c, w: gw + WALL, d: WALL });
    return out;
  }, [l.nx, l.ny, x0, z0, gw, gd, c]);

  const margins = useMemo(() => {
    const m: { x: number; z: number; w: number; d: number }[] = [];
    const W = l.width, D = l.depth;
    if (l.marginLeft > 0.5) m.push({ x: -W / 2 + l.marginLeft / 2, z: 0, w: l.marginLeft, d: D });
    if (l.marginRight > 0.5) m.push({ x: W / 2 - l.marginRight / 2, z: 0, w: l.marginRight, d: D });
    if (l.marginBack > 0.5) m.push({ x: x0 + gw / 2, z: -D / 2 + l.marginBack / 2, w: gw, d: l.marginBack });
    if (l.marginFront > 0.5) m.push({ x: x0 + gw / 2, z: D / 2 - l.marginFront / 2, w: gw, d: l.marginFront });
    return m;
  }, [l, x0, gw]);

  const magnets = useMemo(() => {
    if (!s.magnets) return [];
    const r = 13;
    const pts: [number, number][] = [];
    for (let i = 0; i < l.nx; i++)
      for (let j = 0; j < l.ny; j++) {
        const cx = x0 + i * c + c / 2, cz = z0 + j * c + c / 2;
        pts.push([cx - r, cz - r], [cx + r, cz - r], [cx - r, cz + r], [cx + r, cz + r]);
      }
    return pts;
  }, [s.magnets, l.nx, l.ny, x0, z0, c]);

  const screws = useMemo(() => {
    if (!s.screws) return [];
    const pts: [number, number][] = [];
    for (let i = 1; i < l.nx; i++) for (let j = 1; j < l.ny; j++) pts.push([x0 + i * c, z0 + j * c]);
    if (pts.length === 0) pts.push([x0 + gw / 2, z0 + gd / 2]);
    return pts;
  }, [s.screws, l.nx, l.ny, x0, z0, c, gw, gd]);

  const wallColor = pal.wall ?? pal.plate;
  return (
    <group>
      <RoundedBox args={[l.width, base, l.depth]} radius={Math.min(s.outerRadius, base / 2 - 0.01) || 0.01} position={[0, base / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={pal.plate} roughness={0.75} />
      </RoundedBox>
      {walls.map((w, k) => (
        <mesh key={k} position={[w.x, base + H / 2, w.z]} castShadow receiveShadow>
          <boxGeometry args={[w.w, H, w.d]} />
          <meshStandardMaterial color={wallColor} roughness={0.7} />
        </mesh>
      ))}
      {margins.map((m, k) => (
        <mesh key={`m${k}`} position={[m.x, base + H / 2, m.z]} castShadow receiveShadow>
          <boxGeometry args={[m.w, H, m.d]} />
          <meshStandardMaterial color={pal.margin ?? wallColor} roughness={0.7} />
        </mesh>
      ))}
      {magnets.map(([x, z], k) => (
        <group key={`g${k}`} position={[x, base + 0.05, z]}>
          <mesh>
            <cylinderGeometry args={[s.magnetD / 2, s.magnetD / 2, 0.3, 24]} />
            <meshStandardMaterial color={pal.magnet} roughness={0.35} metalness={0.2} />
          </mesh>
          {s.magnetRelease && (
            <mesh position={[0, 0.2, 0]}>
              <cylinderGeometry args={[s.magnetD / 4, s.magnetD / 4, 0.2, 16]} />
              <meshStandardMaterial color="#1a1a1a" />
            </mesh>
          )}
        </group>
      ))}
      {screws.map(([x, z], k) => (
        <mesh key={`s${k}`} position={[x, base + H + 0.3, z]}>
          <cylinderGeometry args={[s.screwHead / 2, s.screwShaft / 2, 0.8, 24]} />
          <meshStandardMaterial color={pal.screw} roughness={0.35} metalness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

/** Recadre la caméra quand la taille de la plaque ou du cadre change (portrait compris). */
function Fit({ span, view }: { span: number; view: "iso" | "low" }) {
  const { camera, size } = useThree();
  const bucket = Math.round(span / 20);
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const base = view === "iso" ? 1.45 : 1.45;
    const d = span * base * Math.max(1, 1.1 / aspect);
    const dir = view === "iso" ? [0.72, 0.95, 0.9] : [0.25, 0.8, 1.1];
    camera.position.set(dir[0] * d, dir[1] * d, dir[2] * d);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket, view, size.width, size.height, camera]);
  return null;
}

export default function Preview3D({
  s,
  layout,
  palette,
  className,
  view = "iso",
}: {
  s: Settings;
  layout: Layout;
  palette: PreviewPalette;
  className?: string;
  view?: "iso" | "low";
}) {
  const span = Math.max(layout.width, layout.depth);
  return (
    <div className={className}>
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
        camera={{ position: [300, 300, 300], fov: 32, near: 1, far: 20000 }}
      >
        <Fit span={span} view={view} />
        <ambientLight intensity={0.55} />
        <hemisphereLight args={["#ffffff", "#8899aa", 0.6]} />
        <directionalLight position={[span * 0.6, span * 1.4, span * 0.4]} intensity={1.6} castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-span} shadow-camera-right={span} shadow-camera-top={span} shadow-camera-bottom={-span} />
        <Plate s={s} l={layout} pal={palette} />
        <OrbitControls makeDefault enableDamping target={[0, 0, 0]} maxPolarAngle={Math.PI / 2.1} />
      </Canvas>
    </div>
  );
}
