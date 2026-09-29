"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { Box3, MathUtils, PerspectiveCamera, Vector3 } from "three";

/** Canvas area hidden by floating panels, in CSS pixels from each edge. */
export interface ViewInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Duration of the animated reframing. */
const FLIGHT_SECONDS = 0.7;
/** Free space kept around the model inside the visible area, as a fraction of its size. */
const PADDING = { x: 0.05, y: 0.06 };
/** Zoom bounds, relative to the distance that frames the whole model. */
const ZOOM = { min: 0.12, max: 2.5 };

/** The subset of OrbitControls this component drives. */
interface Controls {
  target: Vector3;
  minDistance: number;
  maxDistance: number;
  update(): void;
  addEventListener(type: "start", listener: () => void): void;
  removeEventListener(type: "start", listener: () => void): void;
}

interface Flight {
  from: Vector3;
  to: Vector3;
  fromTarget: Vector3;
  toTarget: Vector3;
  distance: number;
  progress: number;
}

/**
 * Direction from the model to the camera: a three-quarter view from the front right,
 * steeper in a portrait area so that the model fills more of its height.
 */
function viewDirection(visibleAspect: number, box: Box3): Vector3 {
  const size = box.getSize(new Vector3());
  const portrait = visibleAspect < 0.9;
  const azimuth = MathUtils.degToRad(portrait ? (size.x > size.z ? 64 : 22) : 30);
  const elevation = MathUtils.degToRad(portrait ? 50 : 33);
  return new Vector3(
    Math.sin(azimuth) * Math.cos(elevation),
    Math.sin(elevation),
    Math.cos(azimuth) * Math.cos(elevation),
  );
}

function corners(box: Box3): Vector3[] {
  const points: Vector3[] = [];
  for (const x of [box.min.x, box.max.x])
    for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) points.push(new Vector3(x, y, z));
  return points;
}

/** Shifts the projection so that the view is centred in the area the panels leave visible. */
function applyViewOffset(camera: PerspectiveCamera, width: number, height: number, insets: ViewInsets) {
  camera.setViewOffset(width, height, (insets.right - insets.left) / 2, (insets.bottom - insets.top) / 2, width, height);
  camera.updateProjectionMatrix();
}

/**
 * Smallest camera distance along `direction` at which every corner of `box` projects
 * inside the visible area (with padding), found by bisection on a probe camera.
 */
function fitDistance(camera: PerspectiveCamera, width: number, height: number, insets: ViewInsets, box: Box3, direction: Vector3): number {
  const probe = new PerspectiveCamera(camera.fov, width / height, 0.1, 1e6);
  applyViewOffset(probe, width, height, insets);
  const left = -1 + (2 * insets.left) / width;
  const right = 1 - (2 * insets.right) / width;
  const bottom = -1 + (2 * insets.bottom) / height;
  const top = 1 - (2 * insets.top) / height;
  const padX = (right - left) * PADDING.x;
  const padY = (top - bottom) * PADDING.y;
  const centre = box.getCenter(new Vector3());
  const points = corners(box);
  const projected = new Vector3();
  const fits = (distance: number) => {
    probe.position.copy(centre).addScaledVector(direction, distance);
    probe.lookAt(centre);
    probe.updateMatrixWorld();
    return points.every((point) => {
      projected.copy(point).project(probe);
      return (
        projected.x > left + padX && projected.x < right - padX && projected.y > bottom + padY && projected.y < top - padY
      );
    });
  };
  const radius = box.getSize(new Vector3()).length() / 2;
  let near = radius * 0.5;
  let far = radius * 400;
  for (let step = 0; step < 40; step++) {
    const middle = (near + far) / 2;
    if (fits(middle)) far = middle;
    else near = middle;
  }
  return far;
}

/** Screen rectangle of the model's bounding box, in CSS pixels of the canvas. */
function projectedRect(camera: PerspectiveCamera, width: number, height: number, box: Box3) {
  const projected = new Vector3();
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const point of corners(box)) {
    projected.copy(point).project(camera);
    const x = ((projected.x + 1) / 2) * width;
    const y = ((1 - projected.y) / 2) * height;
    left = Math.min(left, x);
    right = Math.max(right, x);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  }
  return { left, top, right, bottom };
}

export interface FramingProps {
  /** World-space bounding box of the model (Y up), or null before the first mesh. */
  box: Box3 | null;
  /** Changes when the model's size changes enough to reframe it. */
  boxKey: string;
  insets: ViewInsets;
  /** Changes when the user asks to recentre the view. */
  recenter: number;
  animate: boolean;
  /** Element that receives `data-view-box`: the model's screen rectangle "left top right bottom". */
  report: RefObject<HTMLElement | null>;
}

/**
 * Automatic framing: whenever the model's size, the canvas size or the hidden area
 * changes (or on demand), the camera flies to a three-quarter view that shows the whole
 * model inside the area the panels leave visible. Orbiting cancels a flight in progress.
 */
export function Framing({ box, boxKey, insets, recenter, animate, report }: FramingProps) {
  // three.js objects are mutable: effects read them from the store rather than from hook values.
  const get = useThree((state) => state.get);
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  // OrbitControls registers itself as the default controls after the first render.
  const hasControls = useThree((state) => state.controls !== null);
  const flight = useRef<Flight | null>(null);
  const framed = useRef(false);
  const viewBox = useRef("");
  const { top, right, bottom, left } = insets;

  useLayoutEffect(() => {
    const { camera, invalidate } = get();
    applyViewOffset(camera as PerspectiveCamera, width, height, { top, right, bottom, left });
    invalidate();
  }, [get, width, height, top, right, bottom, left]);

  useEffect(() => {
    const { invalidate } = get();
    const camera = get().camera as PerspectiveCamera;
    const controls = get().controls as unknown as Controls | null;
    if (!box || !controls || width === 0 || height === 0) return;
    const visible = { top, right, bottom, left };
    const visibleAspect = Math.max(1, width - left - right) / Math.max(1, height - top - bottom);
    const direction = viewDirection(visibleAspect, box);
    const distance = fitDistance(camera, width, height, visible, box, direction);
    const centre = box.getCenter(new Vector3());
    flight.current = {
      from: camera.position.clone(),
      to: centre.clone().addScaledVector(direction, distance),
      fromTarget: controls.target.clone(),
      toTarget: centre,
      distance,
      progress: animate && framed.current ? 0 : 1,
    };
    framed.current = true;
    camera.near = distance / 200;
    camera.far = distance * 20;
    camera.updateProjectionMatrix();
    // Free zoom during the flight; the bounds apply once it lands.
    controls.minDistance = 0;
    controls.maxDistance = Infinity;
    invalidate();
    // boxKey stands for the box: a new box object of the same size must not reframe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boxKey, width, height, top, right, bottom, left, recenter, hasControls, animate, get]);

  useEffect(() => {
    const controls = get().controls as unknown as Controls | null;
    if (!controls) return;
    const stop = () => land(controls, flight);
    controls.addEventListener("start", stop); // the user grabs the view: stop flying
    return () => controls.removeEventListener("start", stop);
  }, [hasControls, get]);

  useFrame((state, delta) => {
    const camera = state.camera as PerspectiveCamera;
    const controls = state.controls as unknown as Controls | null;
    const current = flight.current;
    if (current && controls) {
      current.progress = Math.min(1, current.progress + delta / FLIGHT_SECONDS);
      const eased = 1 - (1 - current.progress) ** 3;
      camera.position.lerpVectors(current.from, current.to, eased);
      controls.target.lerpVectors(current.fromTarget, current.toTarget, eased);
      controls.update();
      if (current.progress >= 1) land(controls, flight);
      else state.invalidate();
    }
    const element = report.current;
    if (box && element) {
      camera.updateMatrixWorld();
      const rect = projectedRect(camera, state.size.width, state.size.height, box);
      const next = [rect.left, rect.top, rect.right, rect.bottom].map(Math.round).join(" ");
      if (next !== viewBox.current) element.setAttribute("data-view-box", next);
      viewBox.current = next;
    }
  });

  return null;
}

/** Ends a flight where it is, and bounds the zoom around the distance it was heading to. */
function land(controls: Controls, flight: RefObject<Flight | null>) {
  const current = flight.current;
  if (!current) return;
  controls.minDistance = current.distance * ZOOM.min;
  controls.maxDistance = current.distance * ZOOM.max;
  flight.current = null;
}
