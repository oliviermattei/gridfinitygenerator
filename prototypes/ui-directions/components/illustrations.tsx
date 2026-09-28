// PROTOTYPE JETABLE — nos propres illustrations (SVG inline, currentColor + var(--accent)).
// Chaque direction les teinte différemment via `color` et la variable CSS --accent.
import type { Align } from "@/lib/settings";

type P = { className?: string; strokeWidth?: number };

/** Coupe d'une poche : deux demi-murets, le pied du bac en pointillé, le fond du tiroir. */
export function ProfileGlyph({ kind, className }: P & { kind: "hybrid" | "flush" }) {
  const hybrid = kind === "hybrid";
  const floor = hybrid ? 64 : 60.5;
  const left = hybrid
    ? "M4 14 H14 L21 21 V39 L42.5 60.5 V64 H4 Z"
    : "M4 14 H14 L21 21 V39 L42.5 60.5 H4 Z";
  const right = hybrid
    ? "M116 14 H106 L99 21 V39 L77.5 60.5 V64 H116 Z"
    : "M116 14 H106 L99 21 V39 L77.5 60.5 H116 Z";
  const footBottom = hybrid ? 58.5 : floor;
  const foot = `M17 4 V12 L24 19 V37 L${hybrid ? 44.5 : 45} ${footBottom} H${hybrid ? 75.5 : 75} L96 37 V19 L103 12 V4`;
  return (
    <svg viewBox="0 0 120 72" className={className} aria-hidden fill="none">
      <line x1="0" y1={floor + 0.5} x2="120" y2={floor + 0.5} stroke="currentColor" strokeOpacity=".35" strokeWidth="1.5" />
      <path d={left} fill="currentColor" fillOpacity=".16" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d={right} fill="currentColor" fillOpacity=".16" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d={foot} stroke="var(--accent, currentColor)" strokeWidth="1.8" strokeDasharray="3 2.5" strokeLinejoin="round" />
      {hybrid && (
        <>
          <path d="M42.5 60.5 V64 M77.5 60.5 V64" stroke="var(--accent, currentColor)" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

/** Coupe d'un logement d'aimant ; l'aimant est à la couleur de la famille. */
export function MagnetGlyph({ release, className }: P & { release?: boolean }) {
  return (
    <svg viewBox="0 0 64 48" className={className} aria-hidden fill="none">
      <path
        d={release ? "M6 12 H20 V26 H29 V40 H6 Z M58 12 H44 V26 H35 V40 H58 Z" : "M6 12 H20 V26 H44 V12 H58 V40 H6 Z"}
        fill="currentColor"
        fillOpacity=".16"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <rect x="21.5" y="15" width="21" height="9.5" rx="1.5" fill="var(--accent, currentColor)" />
      <path d="M32 4 V10" stroke="var(--accent, currentColor)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M28.5 7.5 L32 11 L35.5 7.5" stroke="var(--accent, currentColor)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Vis à tête fraisée dans son trou. */
export function ScrewGlyph({ className }: P) {
  return (
    <svg viewBox="0 0 64 48" className={className} aria-hidden fill="none">
      <path d="M6 10 H20 L27 17 V40 H6 Z M58 10 H44 L37 17 V40 H58 Z" fill="currentColor" fillOpacity=".16" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M21.5 10 H42.5 L35.5 17 H28.5 Z" fill="var(--accent, currentColor)" />
      <path d="M29 17 H35 V44 L32 47 L29 44 Z" fill="var(--accent, currentColor)" fillOpacity=".85" />
      <path d="M29 22 L35 20 M29 27 L35 25 M29 32 L35 30 M29 37 L35 35" stroke="#fff" strokeOpacity=".7" strokeWidth="1" />
    </svg>
  );
}

/** Tiroir vu de dessus avec la grille placée selon l'alignement. */
export function AlignGlyph({ pos, className }: P & { pos: Align }) {
  const col = pos.includes("l") ? 0 : pos.includes("r") ? 2 : 1;
  const row = pos.startsWith("t") ? 0 : pos.startsWith("b") ? 2 : 1;
  const gx = 4 + col * 5.5;
  const gy = 4 + row * 4;
  return (
    <svg viewBox="0 0 32 26" className={className} aria-hidden fill="none">
      <rect x="1" y="1" width="30" height="24" rx="3" stroke="currentColor" strokeOpacity=".45" strokeWidth="1.3" />
      <g transform={`translate(${gx} ${gy})`}>
        <rect width="13" height="10" rx="1.5" fill="var(--accent, currentColor)" fillOpacity=".22" stroke="var(--accent, currentColor)" strokeWidth="1.3" />
        <path d="M4.33 0 V10 M8.66 0 V10 M0 5 H13" stroke="var(--accent, currentColor)" strokeWidth="1" />
      </g>
    </svg>
  );
}

/** Onglet « Tiroir » : façade de tiroir avec cotes. */
export function DrawerGlyph({ className }: P) {
  return (
    <svg viewBox="0 0 48 36" className={className} aria-hidden fill="none">
      <path d="M6 8 H42 V30 H6 Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M18 19 H30" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M6 3 H42 M6 1 V5 M42 1 V5" stroke="var(--accent, currentColor)" strokeWidth="1.4" />
    </svg>
  );
}

/** Onglet « Nombre de cellules » : grille 3 × 2. */
export function CellsGlyph({ className }: P) {
  return (
    <svg viewBox="0 0 48 36" className={className} aria-hidden fill="none">
      {[0, 1, 2].map((i) =>
        [0, 1].map((j) => (
          <rect key={`${i}${j}`} x={6 + i * 12.5} y={7 + j * 12} width="10.5" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"
            fill={i === 0 && j === 0 ? "var(--accent, currentColor)" : "none"} fillOpacity=".3" />
        )),
      )}
    </svg>
  );
}

/** Marque provisoire « Pocketfit » : une poche vue en perspective plate. */
export function BrandMark({ className }: P) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden fill="none">
      <rect x="2" y="2" width="13" height="13" rx="3.5" fill="currentColor" />
      <rect x="17" y="2" width="13" height="13" rx="3.5" fill="currentColor" fillOpacity=".35" />
      <rect x="2" y="17" width="13" height="13" rx="3.5" fill="currentColor" fillOpacity=".35" />
      <rect x="17" y="17" width="13" height="13" rx="3.5" stroke="currentColor" strokeWidth="2" />
      <rect x="21" y="21" width="5" height="5" rx="1.2" fill="currentColor" />
    </svg>
  );
}

/** Buse d'imprimante (profil d'impression). */
export function NozzleGlyph({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round">
      <path d="M7 3 H17 V9 H7 Z" />
      <path d="M9 9 V12 L12 16 L15 12 V9" />
      <path d="M5 21 H19 M8 18.5 H16" strokeOpacity=".55" />
    </svg>
  );
}

/** Glyphe « réglages avancés » : deux curseurs + un compas. */
export function AdvancedGlyph({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M4 7 H20 M4 17 H20" strokeOpacity=".5" />
      <circle cx="9" cy="7" r="2.3" fill="currentColor" />
      <circle cx="15" cy="17" r="2.3" fill="currentColor" />
    </svg>
  );
}

/** Petite règle pour la famille Taille. */
export function RulerGlyph({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round">
      <path d="M3 15.5 L15.5 3 L21 8.5 L8.5 21 Z" />
      <path d="M7 11.5 L9 13.5 M10 8.5 L11.5 10 M13 5.5 L15 7.5" />
    </svg>
  );
}

/** Mire 3 × 3 pour la famille Alignement. */
export function TargetGlyph({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      {[0, 1, 2].map((i) => [0, 1, 2].map((j) => (
        <rect key={`${i}${j}`} x={3.5 + i * 6} y={3.5 + j * 6} width="5" height="5" rx="1.3" fillOpacity={i === 1 && j === 1 ? 1 : 0.35} />
      )))}
    </svg>
  );
}

/** Profil (icône de famille) : une pente et un muret. */
export function ProfileIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
      <path d="M2 5 H6 L8 7 V11 L14 17 V20 H22" />
      <path d="M2 20 H22" strokeOpacity=".4" />
    </svg>
  );
}

/** Aimant (icône de famille) : un disque avec pôles. */
export function MagnetIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8">
      <ellipse cx="12" cy="9" rx="8" ry="3.5" />
      <path d="M4 9 V14.5 C4 16.4 7.6 18 12 18 C16.4 18 20 16.4 20 14.5 V9" />
      <ellipse cx="12" cy="9" rx="3" ry="1.2" fill="currentColor" />
    </svg>
  );
}

/** Vis (icône de famille). */
export function ScrewIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
      <path d="M5 4 H19 L15 8 H9 Z" />
      <path d="M9.5 8 V18 L12 21 L14.5 18 V8" />
      <path d="M9.5 11 L14.5 10 M9.5 14.5 L14.5 13.5" />
    </svg>
  );
}
