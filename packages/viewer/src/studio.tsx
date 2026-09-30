"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  Color,
  type DirectionalLight,
  type Group,
  Mesh,
  MeshBasicMaterial,
  MeshDepthMaterial,
  OrthographicCamera,
  PlaneGeometry,
  type Scene,
  ShaderMaterial,
  WebGLRenderTarget,
  type WebGLRenderer,
} from "three";
import { HorizontalBlurShader } from "three/examples/jsm/shaders/HorizontalBlurShader.js";
import { VerticalBlurShader } from "three/examples/jsm/shaders/VerticalBlurShader.js";

/**
 * Layer of the studio backdrop and of the shadow-catching floor: the main camera sees it,
 * the cameras that render shadows (layer 0 only) do not.
 */
const STAGE_LAYER = 1;

/** Studio colours behind the model: a light centre fading to a darker edge. */
export interface StageColors {
  centre: string;
  edge: string;
}

/** ACES filmic tone mapping, as applied by the effect composer to every pixel. */
function acesFilmic([r, g, b]: [number, number, number]): [number, number, number] {
  const exposure = 1 / 0.6;
  const input = [
    (0.59719 * r + 0.35458 * g + 0.04823 * b) * exposure,
    (0.076 * r + 0.90834 * g + 0.01566 * b) * exposure,
    (0.0284 * r + 0.13383 * g + 0.83777 * b) * exposure,
  ].map((v) => (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.432951) + 0.238081)) as [number, number, number];
  const [x, y, z] = input;
  return [
    1.60475 * x - 0.53108 * y - 0.07367 * z,
    -0.10208 * x + 1.10813 * y - 0.00605 * z,
    -0.00327 * x - 0.07276 * y + 1.07602 * z,
  ];
}

/**
 * Linear colour that comes out of the tone mapping as `hex`: the backdrop then shows the
 * exact CSS colour of the page around the canvas. Solved by fixed-point iteration.
 */
function beforeToneMapping(hex: string): Color {
  const target = new Color(hex);
  const goal: [number, number, number] = [target.r, target.g, target.b];
  const guess: [number, number, number] = [...goal];
  for (let step = 0; step < 60; step++) {
    const mapped = acesFilmic(guess);
    for (let channel = 0; channel < 3; channel++) {
      guess[channel] = Math.max(0, guess[channel]! + (goal[channel]! - mapped[channel]!) * 1.2);
    }
  }
  return new Color(...guess);
}

/**
 * Full-screen gradient drawn behind everything (a shader, so HDR values above 1 survive).
 * `toneMapped`: the frame goes through the tone mapping of the effect composer, which
 * the colours then compensate for.
 */
export function Backdrop({ colors, toneMapped }: { colors: StageColors; toneMapped: boolean }) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        depthWrite: false,
        depthTest: false,
        uniforms: { centre: { value: new Color() }, edge: { value: new Color() } },
        vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.99999, 1.0); }",
        fragmentShader: `
          uniform vec3 centre;
          uniform vec3 edge;
          varying vec2 vUv;
          void main() {
            vec2 d = (vUv - vec2(0.5, 0.58)) * vec2(1.0, 1.25);
            gl_FragColor = vec4(mix(centre, edge, smoothstep(0.18, 0.8, length(d))), 1.0);
          }`,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => {
    const linear = (hex: string) => (toneMapped ? beforeToneMapping(hex) : new Color(hex));
    material.uniforms.centre!.value.copy(linear(colors.centre));
    material.uniforms.edge!.value.copy(linear(colors.edge));
  }, [material, colors.centre, colors.edge, toneMapped]);

  const mesh = useRef<Mesh>(null);
  const camera = useThree((state) => state.camera);
  useLayoutEffect(() => {
    mesh.current?.layers.set(STAGE_LAYER);
    camera.layers.enable(STAGE_LAYER);
  }, [camera]);

  return (
    <mesh ref={mesh} frustumCulled={false} renderOrder={-100} material={material}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

/**
 * Procedural studio: softboxes baked into an environment map (no HDRI to download, the
 * same rendering offline), plus one key light that casts a soft shadow on the floor.
 */
export function StudioLights({ span }: { span: number }) {
  const reach = span * 0.75;
  const keyLight = useRef<DirectionalLight>(null);
  const invalidate = useThree((state) => state.invalidate);
  // three computes the shadow camera projection once: follow the size of the model.
  useEffect(() => {
    keyLight.current?.shadow.camera.updateProjectionMatrix();
    invalidate();
  }, [span, invalidate]);
  return (
    <>
      <Environment resolution={256} frames={1} environmentIntensity={0.85}>
        <color attach="background" args={["#6a6e76"]} />
        {/* Diffuse ceiling. */}
        <Lightformer form="rect" intensity={1.5} color="#ffffff" position={[-1, 7, -1]} scale={[7, 5, 1]} target={[0, 0, 0]} />
        {/* Wide softbox behind: a gradient highlight along the top of the walls. */}
        <Lightformer form="rect" intensity={2.4} color="#ffffff" position={[-2, 3.2, -8]} scale={[14, 3.5, 1]} target={[0, 0, 0]} />
        {/* Warm key on the left, cool fill on the right. */}
        <Lightformer form="rect" intensity={2} color="#fff2e4" position={[-8, 2.5, 2]} scale={[4, 3, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.2} color="#e8efff" position={[8, 2, -1]} scale={[4, 2.5, 1]} target={[0, 0, 0]} />
        {/* Front fill, so that the outer edges do not turn black. */}
        <Lightformer form="rect" intensity={1.6} color="#ffffff" position={[2, 1.5, 9]} scale={[12, 2.5, 1]} target={[0, 0, 0]} />
        {/* Soft bounce from under the floor: the underside reads when the view orbits below. */}
        <Lightformer form="rect" intensity={0.9} color="#ffffff" position={[0, -7, 0]} scale={[10, 10, 1]} target={[0, 0, 0]} />
      </Environment>
      <directionalLight
        ref={keyLight}
        position={[-span * 0.55, span * 1.1, -span * 0.25]}
        intensity={1.05}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-reach}
        shadow-camera-right={reach}
        shadow-camera-top={reach}
        shadow-camera-bottom={-reach}
        shadow-camera-near={1}
        shadow-camera-far={span * 4}
      />
      <hemisphereLight args={["#ffffff", "#c9ccd3", 0.3]} />
    </>
  );
}

/**
 * Plain lights for a WebGL drawn by the CPU: no environment map to sample per pixel, no
 * shadow pass. Enough to read the shape of the model.
 */
export function BasicLights() {
  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[1, 2, 1.5]} intensity={2.2} />
      <directionalLight position={[-1.5, 1, -1]} intensity={0.6} />
      {/* From under the floor: the underside reads when the view orbits below. */}
      <directionalLight position={[0.5, -2, 1]} intensity={1.4} />
    </>
  );
}

/**
 * Invisible floor that only receives the key light's shadow, plus a soft contact shadow.
 * Both are hidden while the camera looks from under the floor, where they would lie
 * between it and the underside of the model.
 */
export function Floor({ span, model }: { span: number; model: string }) {
  const floor = useRef<Group>(null);
  useFrame(({ camera }) => {
    if (floor.current) floor.current.visible = camera.position.y > 0;
  });
  return (
    <group ref={floor}>
      <mesh
        rotation-x={-Math.PI / 2}
        position={[0, -0.01, 0]}
        receiveShadow
        ref={(floor) => void floor?.layers.set(STAGE_LAYER)}
      >
        <planeGeometry args={[span * 4, span * 4]} />
        <shadowMaterial transparent opacity={0.22} color="#1b1f2a" />
      </mesh>
      <ContactShadow size={span * 1.6} far={Math.max(12, span * 0.06)} model={model} />
    </group>
  );
}

const CONTACT_SHADOW = { resolution: 1024, blur: 5, opacity: 0.75, color: "#161920" };

interface ContactShadowResources {
  depth: WebGLRenderTarget;
  blurred: WebGLRenderTarget;
  blurPlane: Mesh;
  depthMaterial: MeshDepthMaterial;
  horizontal: ShaderMaterial;
  vertical: ShaderMaterial;
  camera: OrthographicCamera;
}

/** Renders the depth of the scene seen from below into the shadow texture, then blurs it twice. */
function drawContactShadow(gl: WebGLRenderer, scene: Scene, resources: ContactShadowResources, shadow: Group) {
  const { depth, blurred, blurPlane, depthMaterial, horizontal, vertical, camera } = resources;
  const blur = (amount: number) => {
    blurPlane.visible = true;
    blurPlane.material = horizontal;
    horizontal.uniforms.tDiffuse!.value = depth.texture;
    horizontal.uniforms.h!.value = amount / 256;
    gl.setRenderTarget(blurred);
    gl.render(blurPlane, camera);
    blurPlane.material = vertical;
    vertical.uniforms.tDiffuse!.value = blurred.texture;
    vertical.uniforms.v!.value = amount / 256;
    gl.setRenderTarget(depth);
    gl.render(blurPlane, camera);
    blurPlane.visible = false;
  };
  const background = scene.background;
  const override = scene.overrideMaterial;
  shadow.visible = false;
  scene.background = null;
  scene.overrideMaterial = depthMaterial;
  gl.setRenderTarget(depth);
  gl.render(scene, camera);
  blur(CONTACT_SHADOW.blur);
  blur(CONTACT_SHADOW.blur * 0.4);
  gl.setRenderTarget(null);
  shadow.visible = true;
  scene.overrideMaterial = override;
  scene.background = background;
}

/**
 * Soft shadow right under the model: its depth seen from below the floor, blurred, and
 * laid on the floor. Drawn again only when the model or its size changes, and every GPU
 * resource is released on unmount (unlike drei's ContactShadows, which recreates its
 * render targets without freeing them whenever its size changes).
 */
function ContactShadow({ size, far, model }: { size: number; far: number; model: string }) {
  const resources = useMemo(() => {
    const { resolution, color } = CONTACT_SHADOW;
    const depth = new WebGLRenderTarget(resolution, resolution);
    const blurred = new WebGLRenderTarget(resolution, resolution);
    depth.texture.generateMipmaps = blurred.texture.generateMipmaps = false;
    // A unit plane, scaled to the size: nothing to rebuild when the size changes.
    const plane = new PlaneGeometry(1, 1).rotateX(Math.PI / 2);
    const blurPlane = new Mesh(plane);
    const depthMaterial = new MeshDepthMaterial({ depthTest: false, depthWrite: false });
    depthMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.ucolor = { value: new Color(color) };
      shader.fragmentShader = shader.fragmentShader
        .replace("void main() {", "uniform vec3 ucolor;\nvoid main() {")
        // Colour the shadow, and fade it with the height above the floor.
        .replace("vec4( vec3( 1.0 - fragCoordZ ), opacity );", "vec4( ucolor * fragCoordZ * 2.0, 1.0 - fragCoordZ );");
    };
    const horizontal = new ShaderMaterial({ ...HorizontalBlurShader, depthTest: false });
    const vertical = new ShaderMaterial({ ...VerticalBlurShader, depthTest: false });
    const shown = new MeshBasicMaterial({ transparent: true, map: depth.texture, depthWrite: false });
    const camera = new OrthographicCamera();
    return { depth, blurred, plane, blurPlane, depthMaterial, horizontal, vertical, shown, camera };
  }, []);
  useEffect(
    () => () => {
      const { depth, blurred, plane, depthMaterial, horizontal, vertical, shown } = resources;
      [depth, blurred, plane, depthMaterial, horizontal, vertical, shown].forEach((resource) => resource.dispose());
    },
    [resources],
  );

  const group = useRef<Group>(null);
  const dirty = useRef(true);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    const { camera, blurPlane } = resources;
    Object.assign(camera, { left: -size / 2, right: size / 2, top: size / 2, bottom: -size / 2, near: 0, far });
    camera.updateProjectionMatrix();
    blurPlane.scale.set(size, 1, size);
    dirty.current = true;
    invalidate();
  }, [resources, size, far, model, invalidate]);

  useFrame(({ gl, scene }) => {
    if (!dirty.current || !group.current) return;
    dirty.current = false;
    drawContactShadow(gl, scene, resources, group.current);
  });

  // The camera looks up from just under the floor, through the model.
  return (
    <group ref={group} position={[0, -0.02, 0]} rotation-x={Math.PI / 2}>
      <mesh
        geometry={resources.plane}
        material={resources.shown}
        material-opacity={CONTACT_SHADOW.opacity}
        scale={[size, -1, size]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
      <primitive object={resources.camera} />
    </group>
  );
}

/**
 * The effect composer turns the renderer's auto clear off; the contact shadow needs it
 * (and a transparent clear colour) to clear its own render target on each pass.
 */
export function ClearForContactShadows() {
  useFrame(({ gl }) => {
    gl.autoClear = true;
    gl.setClearAlpha(0);
  }, -1);
  useFrame(({ gl }) => {
    gl.autoClear = false;
    gl.setClearAlpha(1);
  }, 0.5);
  return null;
}
