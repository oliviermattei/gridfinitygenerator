"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Component, useEffect, useMemo, useRef, type ReactNode } from "react";
import { BufferAttribute, BufferGeometry, PerspectiveCamera, Sphere, Vector3 } from "three";

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
  /** Plastic colour of the model. */
  color?: string;
  className?: string;
  /** Shown instead of the 3D view when WebGL is unavailable. */
  fallback?: ReactNode;
}

/** Direction from the model to the camera: in front, slightly to the right, from above. */
const VIEW_DIRECTION = new Vector3(0.5, 1.1, 1).normalize();
/**
 * A new mesh whose bounding sphere moves less than this (in millimetres) keeps the view:
 * the final quality replacing the preview must not undo the user's orbit.
 */
const REFIT_THRESHOLD_MM = 0.5;
/** The mesh is Z up; three.js is Y up. */
const Z_UP_TO_Y_UP: [number, number, number] = [-Math.PI / 2, 0, 0];

/**
 * Simple 3D preview of a mesh with orbit and zoom, reframed whenever the mesh changes size.
 * The studio rendering and the framing around the panels arrive with #6.
 */
export function MeshPreview({ mesh, color = "#8a8580", className, fallback = null }: MeshPreviewProps) {
  const geometry = useMemo(() => {
    if (!mesh) return null;
    const next = new BufferGeometry();
    next.setAttribute("position", new BufferAttribute(mesh.positions, 3));
    next.setIndex(new BufferAttribute(mesh.indices, 1));
    next.computeBoundingSphere();
    return next;
  }, [mesh]);

  useEffect(() => () => geometry?.dispose(), [geometry]);

  return (
    <div className={className} data-testid="mesh-preview" data-triangles={mesh ? mesh.indices.length / 3 : 0}>
      <WebGlBoundary fallback={fallback}>
        <Canvas frameloop="demand" dpr={[1, 2]} camera={{ fov: 35 }} fallback={fallback}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[1, 2, 1.5]} intensity={2.2} />
          <directionalLight position={[-1.5, 1, -1]} intensity={0.6} />
          {geometry && (
            <mesh geometry={geometry} rotation={Z_UP_TO_Y_UP}>
              <meshStandardMaterial color={color} flatShading roughness={0.55} />
            </mesh>
          )}
          <OrbitControls makeDefault enableDamping={false} />
          <FitCamera geometry={geometry} />
        </Canvas>
      </WebGlBoundary>
    </div>
  );
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

interface OrbitTarget {
  target: Vector3;
  update(): void;
}

function FitCamera({ geometry }: { geometry: BufferGeometry | null }) {
  const get = useThree((state) => state.get);
  // OrbitControls registers itself as the default controls (makeDefault) after the first
  // render: subscribing refits once they exist.
  const controls = useThree((state) => state.controls) as unknown as OrbitTarget | null;
  const fitted = useRef<{ sphere: Sphere; controls: OrbitTarget | null } | null>(null);

  useEffect(() => {
    // The camera is mutable three.js state: read it from the store, not from a hook value.
    const { camera, invalidate } = get();
    const sphere = geometry?.boundingSphere;
    if (!sphere || !(camera instanceof PerspectiveCamera)) return;
    const last = fitted.current;
    if (
      last &&
      last.controls === controls &&
      last.sphere.center.distanceTo(sphere.center) < REFIT_THRESHOLD_MM &&
      Math.abs(last.sphere.radius - sphere.radius) < REFIT_THRESHOLD_MM
    ) {
      invalidate(); // same size: redraw the new mesh without moving the camera
      return;
    }
    fitted.current = { sphere: sphere.clone(), controls };
    // Centre of the bounding sphere once the mesh is turned Y up: (x, y, z) -> (x, z, -y).
    const centre = new Vector3(sphere.center.x, sphere.center.z, -sphere.center.y);
    const halfFov = (Math.min(camera.fov, camera.fov * camera.aspect) * Math.PI) / 360;
    const distance = (sphere.radius / Math.sin(halfFov)) * 1.05;
    camera.position.copy(centre).addScaledVector(VIEW_DIRECTION, distance);
    camera.near = distance / 100;
    camera.far = distance * 10;
    camera.updateProjectionMatrix();
    camera.lookAt(centre);
    if (controls) {
      controls.target.copy(centre);
      controls.update();
    }
    invalidate();
  }, [geometry, controls, get]);

  return null;
}
