"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { EffectComposer, N8AO, SMAA, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { Component, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Vector3,
  type WebGLRenderer,
} from "three";
import { Framing, type ViewInsets } from "./framing";
import { Backdrop, BasicLights, ClearForContactShadows, Floor, StudioLights, type StageColors } from "./studio";

/**
 * Indexed triangle mesh to display, in millimetres, Z up. Structurally the same as the
 * geometry engine's mesh, but the viewer knows nothing about the generator that made it.
 */
export interface PreviewMesh {
  positions: Float32Array;
  indices: Uint32Array;
}

export interface MeshPreviewProps {
  mesh: PreviewMesh | null;
  /** Plastic colour of the model (#RRGGBB). */
  color: string;
  /** Canvas area hidden by floating panels: the model is framed in what remains. */
  insets?: Partial<ViewInsets>;
  /** Change it (a counter, say) to fly back to the automatic framing. */
  recenter?: number;
  className?: string;
  /** Shown instead of the 3D view when WebGL is unavailable. */
  fallback?: ReactNode;
}

/** Studio backdrop: light centre, darker edge. */
const STAGE: StageColors = { centre: "#F6F6F7", edge: "#DADBE0" };
/** The mesh is Z up; three.js is Y up. */
const Z_UP_TO_Y_UP: [number, number, number] = [-Math.PI / 2, 0, 0];
/**
 * Size step (millimetres) below which a new mesh keeps the view: the final quality
 * replacing the preview must not undo the user's orbit.
 */
const REFRAME_STEP_MM = 0.5;

/** WebGL drawn by the CPU (no GPU, or GPU blocked): SwiftShader, llvmpipe, WARP. */
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render/i;

function isSoftwareRenderer(gl: WebGLRenderer): boolean {
  const context = gl.getContext();
  const debug = context.getExtension("WEBGL_debug_renderer_info");
  const name: unknown = context.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : context.RENDERER);
  return SOFTWARE_RENDERER.test(String(name));
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

/**
 * 3D preview of a mesh in a photo studio: plastic under procedural softboxes, ambient
 * occlusion and a contact shadow. Damped orbit, bounded zoom, and an animated automatic
 * framing inside the area left visible by the floating panels (`insets`).
 *
 * The container exposes `data-triangles`, `data-color`, `data-extent` (the width and depth
 * of the mesh, in millimetres) and `data-view-box` (the model's screen rectangle, "left top
 * right bottom" in CSS pixels) for end-to-end tests.
 */
export function MeshPreview({ mesh, color, insets, recenter = 0, className, fallback = null }: MeshPreviewProps) {
  const container = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  // Without a GPU (WebGL drawn by the CPU), a studio frame takes about a second and
  // blocks the page: the preview then falls back to plain lights, no post-processing,
  // a pixel ratio of 1 and no framing animation.
  const [software, setSoftware] = useState(false);

  const geometry = useMemo(() => {
    if (!mesh) return null;
    const next = new BufferGeometry();
    next.setAttribute("position", new BufferAttribute(mesh.positions, 3));
    next.setIndex(new BufferAttribute(mesh.indices, 1));
    next.computeBoundingBox();
    return next;
  }, [mesh]);
  useEffect(() => () => geometry?.dispose(), [geometry]);

  // Bounding box once the mesh is turned Y up: (x, y, z) -> (x, z, -y).
  const box = useMemo(() => {
    const source = geometry?.boundingBox;
    if (!source) return null;
    return new Box3(
      new Vector3(source.min.x, source.min.z, -source.max.y),
      new Vector3(source.max.x, source.max.z, -source.min.y),
    );
  }, [geometry]);
  const boxKey = box
    ? [box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z]
        .map((value) => Math.round(value / REFRAME_STEP_MM))
        .join(",")
    : "";
  const span = box ? Math.max(box.max.x - box.min.x, box.max.z - box.min.z, 1) : 200;

  const visible: ViewInsets = { top: 0, right: 0, bottom: 0, left: 0, ...insets };

  return (
    <div
      ref={container}
      className={className}
      style={{ background: STAGE.centre }}
      data-testid="mesh-preview"
      data-triangles={mesh ? mesh.indices.length / 3 : 0}
      data-color={color}
      data-extent={box ? `${(box.max.x - box.min.x).toFixed(1)} ${(box.max.z - box.min.z).toFixed(1)}` : undefined}
    >
      <WebGlBoundary fallback={fallback}>
        <Canvas
          frameloop="demand"
          dpr={software ? 1 : [1, 2]}
          onCreated={({ gl }) => setSoftware(isSoftwareRenderer(gl))}
          shadows="percentage"
          gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
          camera={{ fov: 24, position: [180, 320, 420] }}
          fallback={fallback}
        >
          <Backdrop colors={STAGE} toneMapped={!software} />
          {software ? (
            <BasicLights />
          ) : (
            <>
              <ClearForContactShadows />
              <StudioLights span={span} />
            </>
          )}
          {geometry && <Model geometry={geometry} color={color} studio={!software} />}
          {geometry && !software && <Floor span={span} model={geometry.uuid} />}
          <OrbitControls
            makeDefault
            enableDamping={!reducedMotion}
            dampingFactor={0.08}
            enablePan={false}
            minPolarAngle={0.05}
            maxPolarAngle={Math.PI / 2.15}
          />
          <Framing
            box={box}
            boxKey={boxKey}
            insets={visible}
            recenter={recenter}
            animate={!reducedMotion && !software}
            report={container}
          />
          {!software && (
            <EffectComposer multisampling={0}>
              <N8AO aoRadius={5} distanceFalloff={0.6} intensity={3} quality="high" halfRes={false} />
              <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
              <SMAA />
            </EffectComposer>
          )}
        </Canvas>
      </WebGlBoundary>
    </div>
  );
}

/**
 * The model in PLA-like plastic: satin with a light clear coat in the studio, plain
 * satin otherwise.
 */
function Model({ geometry, color, studio }: { geometry: BufferGeometry; color: string; studio: boolean }) {
  const invalidate = useThree((state) => state.invalidate);
  const plastic = useMemo(
    () =>
      studio
        ? new MeshPhysicalMaterial({
            roughness: 0.48,
            metalness: 0,
            clearcoat: 0.2,
            clearcoatRoughness: 0.42,
            flatShading: true,
          })
        : new MeshStandardMaterial({ roughness: 0.55, metalness: 0, flatShading: true }),
    [studio],
  );
  useEffect(() => () => plastic.dispose(), [plastic]);
  useEffect(() => {
    plastic.color.set(color);
    invalidate();
  }, [plastic, color, invalidate]);

  return <mesh geometry={geometry} material={plastic} rotation={Z_UP_TO_Y_UP} castShadow receiveShadow />;
}

/** Keeps the rest of the page alive when the WebGL context cannot be created. */
class WebGlBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
