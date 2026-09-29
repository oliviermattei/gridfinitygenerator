"use client";
// PROTOTYPE JETABLE — aperçu 3D v2 : vraie silhouette de baseplate (poches à pentes, murets fins,
// logements d'aimants, fraisages), plastique PLA sous éclairage studio procédural, ombre de contact,
// occlusion ambiante, cadrage automatique animé. Géométrie approximative : voir plateGeometry.ts.
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Grid, Lightformer, OrbitControls } from "@react-three/drei";
import { EffectComposer, N8AO, SMAA, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three/examples/jsm/controls/OrbitControls.js";
import type { Layout, Settings } from "@/lib/settings";
import { buildPlate } from "./plateGeometry";

export type Stage = {
  /** "mat" : tapis quadrillé au pas de 42 mm ; "studio" : fond dégradé sans sol visible. */
  kind: "mat" | "studio";
  background: string;
  backgroundEdge?: string;
  gridCell?: string;
  gridSection?: string;
};

type Props = {
  s: Settings;
  layout: Layout;
  color: string;
  stage: Stage;
  className?: string;
  /** Surface masquée par un panneau flottant (px) : l'objet est recentré dans ce qui reste visible. */
  insetRight?: number;
  insetBottom?: number;
  insetTop?: number;
  /** Incrémenter pour recadrer la vue. */
  recenter?: number;
};

const tmpObj = new THREE.Object3D();

function useInstances(ref: React.RefObject<THREE.InstancedMesh | null>, pts: [number, number][], y: number, rotX = 0) {
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    pts.forEach(([x, z], i) => {
      tmpObj.position.set(x, y, z);
      tmpObj.rotation.set(rotX, 0, 0);
      tmpObj.updateMatrix();
      m.setMatrixAt(i, tmpObj.matrix);
    });
    m.count = pts.length;
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [ref, pts, y, rotX]);
}

function Plate({ s, layout, color }: { s: Settings; layout: Layout; color: string }) {
  const model = useMemo(() => buildPlate(s, layout), [
    s.cellSize, s.profile, s.magnets, s.screws, s.magnetD, s.tolerance, s.screwHead, s.outerRadius,
    layout.width, layout.depth, layout.nx, layout.ny, layout.marginLeft, layout.marginBack,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    model.frame.dispose();
    model.floor?.dispose();
    model.funnel.dispose();
  }, [model]);

  const plastic = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        roughness: 0.48,
        metalness: 0,
        clearcoat: 0.2,
        clearcoatRoughness: 0.42,
        sheen: 0,
        sheenRoughness: 0.8,
        envMapIntensity: 1,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const shade = useMemo(() => plastic.clone(), [plastic]);
  useEffect(() => {
    plastic.color.set(color);
    // Fonds de logements : même plastique, plus sombre (occlusion simulée).
    shade.color.set(color).multiplyScalar(0.45);
  }, [color, plastic, shade]);

  const funnels = useRef<THREE.InstancedMesh>(null);
  const magnetFloors = useRef<THREE.InstancedMesh>(null);
  const cones = useRef<THREE.InstancedMesh>(null);
  const shafts = useRef<THREE.InstancedMesh>(null);
  useInstances(funnels, model.cells, model.base);
  const magnetDepth = Math.min(s.magnetH, model.base - 0.4);
  useInstances(magnetFloors, model.magnets, model.base - magnetDepth, -Math.PI / 2);
  const coneH = Math.max(0.2, Math.min((s.screwHead - s.screwShaft) / 2, model.base - 0.6));
  useInstances(cones, model.screws, model.base - coneH / 2);
  useInstances(shafts, model.screws, (model.base - coneH) / 2);

  const r = s.magnetD / 2 + s.tolerance / 2;
  const maxCells = Math.max(1, model.cells.length);
  const maxMag = Math.max(1, model.magnets.length);
  const maxScr = Math.max(1, model.screws.length);
  return (
    <group>
      <mesh geometry={model.frame} material={plastic} castShadow receiveShadow />
      {model.floor && <mesh geometry={model.floor} material={plastic} castShadow receiveShadow />}
      <instancedMesh key={`f${maxCells}-${model.funnel.uuid}`} ref={funnels} args={[model.funnel, plastic, maxCells]} castShadow receiveShadow />
      {model.magnets.length > 0 && (
        <instancedMesh key={`m${maxMag}-${s.magnetRelease}-${r}`} ref={magnetFloors} args={[undefined, shade, maxMag]}>
          {s.magnetRelease ? <ringGeometry args={[s.magnetD / 4, r, 28]} /> : <circleGeometry args={[r, 28]} />}
        </instancedMesh>
      )}
      {model.screws.length > 0 && (
        <>
          <instancedMesh key={`c${maxScr}-${s.screwHead}-${s.screwShaft}-${coneH}`} ref={cones} args={[undefined, shade, maxScr]}>
            <cylinderGeometry args={[s.screwHead / 2, s.screwShaft / 2, coneH, 28, 1, true]} />
          </instancedMesh>
          <instancedMesh key={`s${maxScr}-${s.screwShaft}-${coneH}`} ref={shafts} args={[undefined, shade, maxScr]}>
            <cylinderGeometry args={[s.screwShaft / 2, s.screwShaft / 2, model.base - coneH, 20, 1, true]} />
          </instancedMesh>
        </>
      )}
    </group>
  );
}

/** Cadrage automatique : anime la caméra vers une vue 3/4 qui contient toute la baseplate. */
function AutoFit({ span, width, depth, insets, recenter }: {
  span: number; width: number; depth: number; insets: [number, number, number]; recenter: number;
}) {
  const { camera, size, controls } = useThree() as unknown as {
    camera: THREE.PerspectiveCamera; size: { width: number; height: number }; controls: OrbitControlsImpl | null;
  };
  const anim = useRef<{ from: THREE.Vector3; to: THREE.Vector3; t: number } | null>(null);
  const [ir, ib, it] = insets;

  // Décale le centre de projection pour que l'objet soit centré dans la zone non masquée.
  useLayoutEffect(() => {
    const W = size.width, H = size.height;
    camera.setViewOffset(W, H, ir / 2, (ib - it) / 2, W, H);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height, ir, ib, it]);

  useEffect(() => {
    const W = Math.max(1, size.width), H = Math.max(1, size.height);
    // En portrait, vue plus plongeante : la baseplate occupe davantage la hauteur disponible.
    const visAspect = (W - ir) / Math.max(1, H - ib - it);
    const az = THREE.MathUtils.degToRad(visAspect < 0.9 ? (width > depth ? 64 : 22) : 30);
    const el = THREE.MathUtils.degToRad(visAspect < 0.9 ? 50 : 33);
    const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    // Caméra-sonde identique (même décalage) ; zone visible en NDC, marge de 8 %.
    const probe = new THREE.PerspectiveCamera(camera.fov, W / H, 1, 50000);
    probe.setViewOffset(W, H, ir / 2, (ib - it) / 2, W, H);
    probe.updateProjectionMatrix();
    const x0 = -1, x1 = 1 - (2 * ir) / W, y0 = -1 + (2 * ib) / H, y1 = 1 - (2 * it) / H;
    const padX = (x1 - x0) * 0.05, padY = (y1 - y0) * 0.06;
    const corners: THREE.Vector3[] = [];
    for (const x of [-width / 2, width / 2]) for (const y of [0, 8]) for (const z of [-depth / 2, depth / 2]) corners.push(new THREE.Vector3(x, y, z));
    const fits = (d: number) => {
      probe.position.copy(dir).multiplyScalar(d);
      probe.lookAt(0, 0, 0);
      probe.updateMatrixWorld();
      const v = new THREE.Vector3();
      return corners.every((c) => {
        v.copy(c).project(probe);
        return v.x > x0 + padX && v.x < x1 - padX && v.y > y0 + padY && v.y < y1 - padY;
      });
    };
    let lo = 10, hi = 40000;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) hi = mid; else lo = mid;
    }
    const to = dir.clone().multiplyScalar(hi);
    anim.current = { from: camera.position.clone(), to, t: 0 };
    if (controls) {
      controls.target.set(0, 0, 0);
      controls.minDistance = Math.max(20, hi * 0.08);
      controls.maxDistance = hi * 2.5;
    }
  }, [span, width, depth, size.width, size.height, ir, ib, it, recenter, camera, controls]);

  useFrame((_, dt) => {
    const a = anim.current;
    if (!a) return;
    a.t = Math.min(1, a.t + dt / 0.7);
    const k = 1 - Math.pow(1 - a.t, 3);
    camera.position.lerpVectors(a.from, a.to, k);
    camera.lookAt(0, 0, 0);
    controls?.update();
    if (a.t >= 1) anim.current = null;
  });
  return null;
}

/** Le compositeur coupe gl.autoClear ; ContactShadows en a besoin pour vider sa cible à chaque passe. */
function AutoClearForShadows() {
  const gl = useThree((st) => st.gl);
  // …et d'un fond transparent (le canevas est opaque, donc clearAlpha vaut 1 par défaut).
  useFrame(() => { gl.autoClear = true; gl.setClearAlpha(0); }, -1);
  useFrame(() => { gl.autoClear = false; gl.setClearAlpha(1); }, 0.5);
  return null;
}

/* Le fond passe par le tone mapping ACES du compositeur : on précompense pour obtenir la teinte CSS exacte. */
function acesFwd([r, g, b]: number[]) {
  const e = 1 / 0.6;
  const i = [0.59719 * r + 0.35458 * g + 0.04823 * b, 0.076 * r + 0.90834 * g + 0.01566 * b, 0.0284 * r + 0.13383 * g + 0.83777 * b].map((v) => v * e);
  const f = i.map((v) => (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.432951) + 0.238081));
  return [
    1.60475 * f[0] - 0.53108 * f[1] - 0.07367 * f[2],
    -0.10208 * f[0] + 1.10813 * f[1] - 0.00605 * f[2],
    -0.00327 * f[0] - 0.07276 * f[1] + 1.07602 * f[2],
  ];
}
function preToneMapped(hex: string) {
  const target = new THREE.Color(hex); // linéaire
  const t = [target.r, target.g, target.b];
  const x = [...t];
  for (let n = 0; n < 60; n++) {
    const y = acesFwd(x);
    for (let k = 0; k < 3; k++) x[k] = Math.max(0, x[k] + (t[k] - y[k]) * 1.2);
  }
  return new THREE.Color(x[0], x[1], x[2]);
}

/** Fond plein écran en shader (valeurs HDR > 1 possibles, contrairement à une texture 8 bits). */
function Backdrop({ stage }: { stage: Stage }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        depthWrite: false,
        depthTest: false,
        uniforms: { cIn: { value: new THREE.Color() }, cOut: { value: new THREE.Color() } },
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.99999, 1.0); }",
        fragmentShader:
          "uniform vec3 cIn; uniform vec3 cOut; varying vec2 vUv; void main(){ vec2 d = (vUv - vec2(0.5, 0.58)) * vec2(1.0, 1.25); float k = smoothstep(0.18, 0.8, length(d)); gl_FragColor = vec4(mix(cIn, cOut, k), 1.0); }",
      }),
    [],
  );
  useEffect(() => {
    mat.uniforms.cIn.value.copy(preToneMapped(stage.background));
    mat.uniforms.cOut.value.copy(preToneMapped(stage.backgroundEdge ?? stage.background));
  }, [mat, stage.background, stage.backgroundEdge]);
  // Calque 1 : vu par la caméra principale, ignoré par les caméras d'ombre (ContactShadows).
  const ref = useRef<THREE.Mesh>(null);
  const camera = useThree((st) => st.camera);
  useLayoutEffect(() => {
    ref.current?.layers.set(1);
    camera.layers.enable(1);
  }, [camera]);
  return (
    <mesh ref={ref} frustumCulled={false} renderOrder={-100} material={mat}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

export default function Preview3D({ s, layout, color, stage, className, insetRight = 0, insetBottom = 0, insetTop = 0, recenter = 0 }: Props) {
  const span = Math.max(layout.width, layout.depth);
  const shadowKey = `${layout.width}-${layout.depth}-${layout.nx}-${layout.ny}-${s.magnets || s.screws}-${s.profile}`;
  return (
    <div className={className} style={{ background: stage.background }}>
      <Canvas
        shadows="soft"
        dpr={[1, 2]}
        gl={{ antialias: false, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: true }}
        camera={{ position: [180, 320, 420], fov: 24, near: 1, far: 50000 }}
      >
        <Backdrop stage={stage} />
        <AutoClearForShadows />
        <AutoFit span={span} width={layout.width} depth={layout.depth} insets={[insetRight, insetBottom, insetTop]} recenter={recenter} />

        {/* Studio procédural (softboxes) : pas de HDRI téléchargé, rendu identique hors ligne. */}
        <Environment resolution={256} frames={1} environmentIntensity={0.85}>
          <color attach="background" args={["#6a6e76"]} />
          {/* plafond diffus */}
          <Lightformer form="rect" intensity={1.5} color="#ffffff" position={[-1, 7, -1]} scale={[7, 5, 1]} target={[0, 0, 0]} />
          {/* grande boîte à lumière derrière : dégradé de reflet sur le dessus des murets */}
          <Lightformer form="rect" intensity={2.4} color="#ffffff" position={[-2, 3.2, -8]} scale={[14, 3.5, 1]} target={[0, 0, 0]} />
          {/* clé chaude à gauche, contre bleutée à droite */}
          <Lightformer form="rect" intensity={2} color="#fff2e4" position={[-8, 2.5, 2]} scale={[4, 3, 1]} target={[0, 0, 0]} />
          <Lightformer form="rect" intensity={1.2} color="#e8efff" position={[8, 2, -1]} scale={[4, 2.5, 1]} target={[0, 0, 0]} />
          {/* débouchage face caméra, pour ne pas noircir les chants */}
          <Lightformer form="rect" intensity={1.6} color="#ffffff" position={[2, 1.5, 9]} scale={[12, 2.5, 1]} target={[0, 0, 0]} />
        </Environment>
        <directionalLight
          position={[-span * 0.55, span * 1.1, -span * 0.25]}
          intensity={1.05}
          castShadow
          shadow-mapSize={[4096, 4096]}
          shadow-bias={-0.0004}
          shadow-normalBias={0.02}
          shadow-camera-left={-span * 0.75}
          shadow-camera-right={span * 0.75}
          shadow-camera-top={span * 0.75}
          shadow-camera-bottom={-span * 0.75}
          shadow-camera-near={1}
          shadow-camera-far={span * 4}
        />
        <hemisphereLight args={["#ffffff", "#c9ccd3", 0.3]} />

        <Plate s={s} layout={layout} color={color} />

        {/* Sol invisible qui ne reçoit que l'ombre portée de la lampe principale. */}
        <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 0]} receiveShadow ref={(m) => { m?.layers.set(1); }}>
          <planeGeometry args={[span * 4, span * 4]} />
          <shadowMaterial transparent opacity={stage.kind === "studio" ? 0.22 : 0.18} color="#1b1f2a" />
        </mesh>
        <ContactShadows
          key={shadowKey}
          frames={40}
          position={[0, -0.02, 0]}
          scale={span * 1.6}
          far={Math.max(12, span * 0.06)}
          blur={5}
          opacity={stage.kind === "studio" ? 0.75 : 0.55}
          resolution={1024}
          color="#161920"
        />
        {stage.kind === "mat" && (
          <Grid
            position={[0, -0.05, 0]}
            args={[10, 10]}
            cellSize={s.cellSize / 3}
            sectionSize={s.cellSize}
            cellThickness={0.6}
            sectionThickness={1}
            cellColor={stage.gridCell}
            sectionColor={stage.gridSection}
            infiniteGrid
            fadeDistance={span * 1.3}
            fadeFrom={0}
            fadeStrength={1.6}
            followCamera={false}
          />
        )}

        <OrbitControls makeDefault enableDamping dampingFactor={0.08} maxPolarAngle={Math.PI / 2.15} minPolarAngle={0.05} enablePan={false} />
        <EffectComposer multisampling={0}>
          <N8AO aoRadius={5} distanceFalloff={0.6} intensity={3} quality="high" halfRes={false} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <SMAA />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
