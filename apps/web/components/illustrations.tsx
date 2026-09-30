// Illustrations of the Studio interface. Drawing rules: 1.5 px round strokes, material in
// currentColor at 10 %, and the element that changes in var(--art), which turns to the
// accent when its control is selected.

import { ALIGNMENTS, type Alignment, type BaseplateType, type MarginShape, type PocketProfileName } from "@repo/geometry";

interface ArtProps {
  className?: string;
}

const stroke = {
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinejoin: "round",
  strokeLinecap: "round",
} as const;
const material = { fill: "currentColor", fillOpacity: 0.1 } as const;
const ART = "var(--art, currentColor)";

/** Provisional brand mark: a pocket seen from above, with its 45° slopes in the corners. */
export function PocketMark({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden fill="none">
      <rect x="1.5" y="1.5" width="25" height="25" rx="6" stroke="currentColor" strokeWidth={2} />
      <rect x="8" y="8" width="12" height="12" rx="2.5" fill="var(--accent)" />
      <path
        d="M4.2 4.2 L8.8 8.8 M23.8 4.2 L19.2 8.8 M4.2 23.8 L8.8 19.2 M23.8 23.8 L19.2 19.2"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Family icon "Taille": a tray with a dimension line. */
export function SizeIcon({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" {...stroke} strokeWidth={1.6}>
      <rect x="4" y="7" width="16" height="12" rx="2" />
      <path d="M4 3.5 H20 M4 2 V5 M20 2 V5" />
    </svg>
  );
}

/** Family icon "Type": a pocket between two murets, in section, on a floor. */
export function TypeIcon({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" {...stroke} strokeWidth={1.6}>
      <path d="M3 5 H5.5 L8 7.5 V17 H16 V7.5 L18.5 5 H21 V20 H3 Z" />
      <path d="M8 17 H16" strokeOpacity={0.45} />
    </svg>
  );
}

/**
 * Type of baseplate, in section: a pocket between two murets, the bin foot dashed, on the
 * drawer or the desk. The open grid (normal) has nothing under the pocket; the tray raises
 * the pocket on a floor (in var(--art)), and the foot stays clear of it, on its slopes; the
 * skeleton, cut through the middle of its murets, keeps their low band (in var(--art)), the
 * posts of the corners behind it, dashed; CLICKbase cuts a slit behind the pocket wall (in
 * var(--art)), which bends its ergot into the pocket, over the foot.
 */
export function TypeArt({ kind, className }: ArtProps & { kind: BaseplateType }) {
  // The pockets of the tray rise by 8, on a floor of 11: the foot stays clear of it.
  const lift = kind === "tray" ? 8 : 0;
  const posts = kind === "skeleton" ? { strokeOpacity: 0.4, strokeDasharray: "2.5 2", fillOpacity: 0.04 } : {};
  const wall = (side: 1 | -1) => {
    const x = (at: number) => (side === 1 ? at : 120 - at);
    return `M${x(2)} ${18 - lift} H${x(14)} L${x(26.9)} ${30.9 - lift} V${41.7 - lift} L${x(31.1)} ${45.9 - lift} V51 H${x(2)} Z`;
  };
  return (
    <svg viewBox="0 0 120 56" className={className} aria-hidden fill="none">
      <path d="M2 51 H118" {...stroke} strokeOpacity={0.35} />
      <path d={wall(1)} {...stroke} {...material} {...posts} />
      <path d={wall(-1)} {...stroke} {...material} {...posts} />
      {kind === "tray" && <path d="M31.1 40 H88.9 V51 H31.1 Z" fill={ART} />}
      {kind === "skeleton" && <path d="M2 47.6 H31.1 V51 H2 Z M88.9 47.6 H118 V51 H88.9 Z" fill={ART} />}
      {kind === "clickbase" && (
        <>
          <path d="M22.6 48.6 V26.6 M97.4 48.6 V26.6" stroke={ART} strokeWidth={1.6} strokeLinecap="round" />
          <path d="M26.9 34 L29.6 36.7 V39 L26.9 41.7 Z M93.1 34 L90.4 36.7 V39 L93.1 41.7 Z" fill={ART} />
        </>
      )}
      <path
        d="M16.5 9 V18.5 L29 31 V41.3 L33.2 45.5 H86.8 L91 41.3 V31 L103.5 18.5 V9"
        transform={`translate(0 ${-lift})`}
        stroke={ART}
        strokeWidth={1.6}
        strokeDasharray="3 2.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Family icon "Alignement": a grid pushed into a corner of the drawer. */
export function AlignIcon({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" {...stroke} strokeWidth={1.6}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <rect x="6.5" y="7.5" width="7" height="5" rx="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Family icon "Vis": a countersunk screw, head up. */
export function ScrewIcon({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" {...stroke} strokeWidth={1.6}>
      <path d="M5 4 H19 L15 8 H9 Z" />
      <path d="M9.5 8 V18 L12 21 L14.5 18 V8 M9.5 11.5 L14.5 10.5 M9.5 15 L14.5 14" />
    </svg>
  );
}

/**
 * Screw holes: the crossing of the murets in section, drilled through; the head of the
 * screw bears on its countersink, under the slopes of the pockets.
 */
export function ScrewArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 64 44" className={className} aria-hidden fill="none">
      <path d="M4 40 H60" {...stroke} strokeOpacity={0.35} />
      <path d="M14 40 V26 L23 17 V24 L28 29 V40 Z" {...stroke} {...material} />
      <path d="M50 40 V26 L41 17 V24 L36 29 V40 Z" {...stroke} {...material} />
      <path d="M23.5 24 H40.5 L35.5 29 H28.5 Z" fill={ART} />
      <path d="M29 29 H35 V40 L32 43 L29 40 Z" fill={ART} fillOpacity={0.75} />
    </svg>
  );
}

/** Family icon "Clips": the U-shaped staple, bridge down. */
export function ClipIcon({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" {...stroke} strokeWidth={1.6}>
      <path d="M5 5 V19 H19 V5 H15 V15 H9 V5 Z" />
    </svg>
  );
}

/** Family icon "Empiler les pièces": three pieces in section, one on another, a layer of air between them. */
export function StackIcon({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" {...stroke} strokeWidth={1.6}>
      <rect x="3" y="15.5" width="18" height="4.5" rx="1" />
      <rect x="3" y="9.5" width="18" height="4" rx="1" />
      <rect x="6" y="3.5" width="12" height="4" rx="1" />
    </svg>
  );
}

/**
 * Clips: the muret on a cut in section, a piece on each side of the dashed cut; the clip
 * (in var(--art)) pushed up from below, flush with the bottom, grips the tooth of each piece
 * and stays under the slopes of the pockets.
 */
export function ClipArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 64 44" className={className} aria-hidden fill="none">
      <path d="M4 40 H60" {...stroke} strokeOpacity={0.35} />
      <path d="M13 40 V27 L27 13 H31.5 V40 Z" {...stroke} {...material} />
      <path d="M51 40 V27 L37 13 H32.5 V40 Z" {...stroke} {...material} />
      <path d="M22 40 V27 H26.5 V35 H37.5 V27 H42 V40 Z" fill={ART} />
      <path d="M32 8 V43" {...stroke} strokeOpacity={0.5} strokeDasharray="2 2.5" />
    </svg>
  );
}

/** Family icon "Avancé": two sliders. */
export function AdvancedIcon({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" {...stroke} strokeWidth={1.6}>
      <path d="M4 8 H20 M4 16 H20" strokeOpacity={0.45} />
      <circle cx="9" cy="8" r="2.4" fill="var(--color-surface, white)" />
      <circle cx="15" cy="16" r="2.4" fill="var(--color-surface, white)" />
    </svg>
  );
}

/**
 * Button of the alignment pad: the drawer seen from above (the back at the top), and the
 * grid pushed to one of its 9 positions.
 */
export function AlignArt({ alignment, className }: ArtProps & { alignment: Alignment }) {
  // ALIGNMENTS runs like a keypad: row by row from the back left.
  const index = ALIGNMENTS.indexOf(alignment);
  const [row, column] = [Math.floor(index / 3), index % 3];
  return (
    <svg viewBox="0 0 28 22" className={className} aria-hidden fill="none">
      <rect x="0.75" y="0.75" width="26.5" height="20.5" rx="3" stroke="currentColor" strokeOpacity={0.4} strokeWidth={1.2} />
      <g transform={`translate(${3 + column * 4} ${3 + row * 3})`}>
        <rect width="14" height="10" rx="1.6" fill={ART} fillOpacity={0.18} stroke={ART} strokeWidth={1.2} />
        <path d="M7 0 V10 M0 5 H14" stroke={ART} strokeWidth={1} />
      </g>
    </svg>
  );
}

/** Family icon "Marge": the corner of the drawer, and the grid set in from it. */
export function MarginIcon({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" {...stroke} strokeWidth={1.6}>
      <path d="M3 21 V6 A3 3 0 0 1 6 3 H21" />
      <path d="M9 21 V9 H21" strokeOpacity={0.45} />
      <path d="M6.5 9 V6.5 H9" />
    </svg>
  );
}

/**
 * The margin in a corner of the drawer, seen from above: the grid (two pockets of each
 * side, in currentColor) and, in var(--art), what the shape adds between it and the drawer:
 * the frame (an outer wall and a crossbar on each grid line), truncated cells (the pockets
 * carried on, cut by the outer wall) or a bracket (an L of outer wall and two crossbars).
 */
export function MarginArt({ kind, className }: ArtProps & { kind: MarginShape }) {
  // The drawer's corner at the top left; the grid from (22, 16), cells of 18.
  const pockets = [
    [22, 16],
    [40, 16],
    [22, 34],
    [40, 34],
  ] as const;
  return (
    <svg viewBox="0 0 64 52" className={className} aria-hidden fill="none">
      <path d="M2 50 V8 A6 6 0 0 1 8 2 H62" {...stroke} strokeOpacity={0.35} />
      <path d="M22 50 V16 H62" {...stroke} {...material} />
      {pockets.map(([x, y]) => (
        <rect key={`${x},${y}`} x={x + 2.5} y={y + 2.5} width="13" height="13" rx="2.5" {...stroke} strokeOpacity={0.55} />
      ))}
      {kind === "frame" && (
        <path d="M4.5 50 V9 A4.5 4.5 0 0 1 9 4.5 H62 M22 4.5 V16 M40 4.5 V16 M58 4.5 V16 M4.5 16 H22 M4.5 34 H22" stroke={ART} strokeWidth={2.2} strokeLinecap="round" />
      )}
      {kind === "brackets" && (
        <path d="M4.5 26 V9 A4.5 4.5 0 0 1 9 4.5 H32 M22 4.5 V16 M4.5 16 H22" stroke={ART} strokeWidth={2.2} strokeLinecap="round" />
      )}
      {kind === "cells" && (
        <>
          <path d="M4.5 50 V9 A4.5 4.5 0 0 1 9 4.5 H62" stroke={ART} strokeWidth={2.2} strokeLinecap="round" />
          {[
            [6.5, 6.5, 13, 7],
            [24.5, 6.5, 13, 7],
            [42.5, 6.5, 13, 7],
            [6.5, 18.5, 13, 13],
            [6.5, 36.5, 13, 13],
          ].map(([x, y, w, h]) => (
            <rect key={`${x},${y}`} x={x} y={y} width={w} height={h} rx="2" stroke={ART} strokeWidth={1.4} />
          ))}
        </>
      )}
    </svg>
  );
}

/** Family icon "Profil de poche": the stepped slope of a pocket wall. */
export function ProfileIcon({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" {...stroke} strokeWidth={1.6}>
      <path d="M2 6 H6 L9.5 9.5 V13.5 L14 18 H22" />
      <path d="M2 21 H22" strokeOpacity={0.45} />
    </svg>
  );
}

/**
 * Cross-section of a pocket: two walls, the bin foot dashed, the drawer floor. The
 * hybrid profile lifts the foot on a 0.35 mm step; the flush one lays it on the floor.
 * Proportions follow the standard profile (0.7 / 1.8 / 2.15 mm).
 */
export function ProfileArt({ kind, className }: ArtProps & { kind: PocketProfileName }) {
  const hybrid = kind === "hybrid";
  const floor = hybrid ? 45 : 40;
  const step = hybrid ? `V${floor}` : "";
  return (
    <svg viewBox="0 0 120 56" className={className} aria-hidden fill="none">
      <path d={`M2 ${floor} H118`} {...stroke} strokeOpacity={0.35} />
      <path d={`M2 12 H14 L26.9 24.9 V35.7 L31.1 39.9 ${step} H2 Z`} {...stroke} {...material} />
      <path d={`M118 12 H106 L93.1 24.9 V35.7 L88.9 39.9 ${step} H118 Z`} {...stroke} {...material} />
      <path
        d="M16.5 3 V12.5 L29 25 V35.3 L33.2 39.5 H86.8 L91 35.3 V25 L103.5 12.5 V3"
        stroke={ART}
        strokeWidth={1.6}
        strokeDasharray="3 2.4"
        strokeLinejoin="round"
      />
      {hybrid ? (
        <path d="M31.1 40.4 V44.6 M88.9 40.4 V44.6" stroke={ART} strokeWidth={2.6} strokeLinecap="round" />
      ) : (
        <path d="M33.5 40 H86.5" stroke={ART} strokeWidth={2.6} strokeLinecap="round" strokeOpacity={0.9} />
      )}
    </svg>
  );
}

/**
 * Test kit in section, front to back: the hybrid cell, then the flush cell, 0.35 mm lower;
 * the muret between them steps down (in var(--art)).
 */
export function TestKitArt({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 64 44" className={className} aria-hidden fill="none">
      <path d="M2 40 H62" {...stroke} strokeOpacity={0.35} />
      <path d="M4 40 V12 H5 L11 18 V40 Z" {...stroke} {...material} />
      <path d="M26 40 V18 L31 12 H32 V17 H33 L38 22 V40 Z" {...stroke} {...material} />
      <path d="M60 40 V17 H59 L54 22 V40 Z" {...stroke} {...material} />
      <path d="M32 12 V17" stroke={ART} strokeWidth={2.4} strokeLinecap="round" />
    </svg>
  );
}

/** Family icon "Compartiments": a bin seen from above, divided in four. */
export function CompartmentIcon({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" {...stroke} strokeWidth={1.6}>
      <rect x="4" y="5" width="16" height="14" rx="2.5" />
      <path d="M12 5 V19 M4 12 H20" strokeOpacity={0.55} />
    </svg>
  );
}

/** Family icon "Finitions": a bin seen from the side, its floor curving into the wall, a scoop in front. */
export function FinishIcon({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" {...stroke} strokeWidth={1.6}>
      <path d="M4 5 V16 Q4 19 7 19 H17 Q20 19 20 16 V5" />
      <path d="M4 11 Q4 16 10 16" strokeOpacity={0.55} />
    </svg>
  );
}

/** Family icon "Rebord d'empilage": the top of a wall with its stepped lip. */
export function LipIcon({ className }: ArtProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" {...stroke} strokeWidth={1.6}>
      <path d="M6 20 V9 L9 6 H10 V10 L12 12 V20" />
      <path d="M14 20 V14 H19" strokeOpacity={0.55} />
    </svg>
  );
}
