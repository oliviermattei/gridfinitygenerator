// PROTOTYPE JETABLE — illustrations v2, dessinées pour Pocketfit (aucune reprise d'extrabold).
// Règles : trait 1,5 px arrondi, matière = currentColor à 10 %, élément qui change = var(--accent).
// Les coupes respectent les proportions de la spec (profil 0,7 / 1,8 / 2,15 mm).
import type { Align } from "@/lib/settings";

type P = { className?: string };
const stroke = { stroke: "currentColor", strokeWidth: 1.5, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
const matter = { fill: "currentColor", fillOpacity: 0.1 };
const ACC = "var(--art, currentColor)";

/** Coupe d'une poche : deux murets, le pied du bac en tirets, le fond du tiroir. */
export function ProfileArt({ kind, className }: P & { kind: "hybrid" | "flush" }) {
  const h = kind === "hybrid";
  const step = h ? 5 : 0;
  const floor = 40 + step;
  const L = `M2 12 H14 L26.9 24.9 V35.7 L31.1 39.9 ${h ? `V${floor}` : ""} H2 Z`;
  const R = `M118 12 H106 L93.1 24.9 V35.7 L88.9 39.9 ${h ? `V${floor}` : ""} H118 Z`;
  return (
    <svg viewBox="0 0 120 56" className={className} aria-hidden fill="none">
      <path d={`M2 ${floor} H118`} {...stroke} strokeOpacity={0.35} />
      <path d={L} {...stroke} {...matter} />
      <path d={R} {...stroke} {...matter} />
      <path d="M16.5 3 V12.5 L29 25 V35.3 L33.2 39.5 H86.8 L91 35.3 V25 L103.5 12.5 V3" stroke={ACC} strokeWidth={1.6} strokeDasharray="3 2.4" strokeLinejoin="round" />
      {h ? (
        <path d="M31.1 40.4 V44.6 M88.9 40.4 V44.6" stroke={ACC} strokeWidth={2.6} strokeLinecap="round" />
      ) : (
        <path d="M33.5 40 H86.5" stroke={ACC} strokeWidth={2.6} strokeLinecap="round" strokeOpacity={0.9} />
      )}
    </svg>
  );
}

/** Aimant au-dessus de son logement (activer les aimants). */
export function MagnetArt({ className }: P) {
  return (
    <svg viewBox="0 0 64 44" className={className} aria-hidden fill="none">
      <path d="M4 26 H22 V34 H42 V26 H60 V40 H4 Z" {...stroke} {...matter} />
      <rect x="23" y="10" width="18" height="7" rx="1.6" fill={ACC} />
      <path d="M32 19.5 V24 M29.4 21.6 L32 24.2 L34.6 21.6" stroke={ACC} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Logement d'aimant : fond plein ou trou d'éjection traversant. */
export function ReleaseArt({ through, className }: P & { through: boolean }) {
  return (
    <svg viewBox="0 0 64 44" className={className} aria-hidden fill="none">
      <path
        d={through ? "M4 12 H21 V24 H28 V36 H4 Z M60 12 H43 V24 H36 V36 H60 Z" : "M4 12 H21 V24 H43 V12 H60 V36 H4 Z"}
        {...stroke}
        {...matter}
      />
      <rect x="22.5" y="16.5" width="19" height="6.5" rx="1.4" fill={ACC} />
      {through && <path d="M32 42 V28.5 M29.4 31 L32 28.4 L34.6 31" stroke={ACC} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

/** Vis à tête fraisée dans la dalle. */
export function ScrewArt({ className }: P) {
  return (
    <svg viewBox="0 0 64 44" className={className} aria-hidden fill="none">
      <path d="M4 14 H20 L27 21 V36 H4 Z M60 14 H44 L37 21 V36 H60 Z" {...stroke} {...matter} />
      <path d="M21.5 13 H42.5 L35.6 20 H28.4 Z" fill={ACC} />
      <path d="M29 20 H35 V39 L32 42 L29 39 Z" fill={ACC} fillOpacity={0.75} />
      <path d="M32 6 V10" stroke={ACC} strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

/** Onglet « Tiroir » : tiroir vu de dessus, cotes largeur et profondeur. */
export function DrawerArt({ className }: P) {
  return (
    <svg viewBox="0 0 40 32" className={className} aria-hidden fill="none">
      <rect x="9" y="9" width="27" height="20" rx="2.5" {...stroke} {...matter} />
      <path d="M9 4 H36 M9 2.5 V5.5 M36 2.5 V5.5" stroke={ACC} strokeWidth={1.4} strokeLinecap="round" />
      <path d="M4 9 V29 M2.5 9 H5.5 M2.5 29 H5.5" stroke={ACC} strokeWidth={1.4} strokeLinecap="round" />
    </svg>
  );
}

/** Onglet « Nombre de cellules » : grille 3 × 2 comptée. */
export function CellsArt({ className }: P) {
  return (
    <svg viewBox="0 0 40 32" className={className} aria-hidden fill="none">
      {[0, 1, 2].map((i) =>
        [0, 1].map((j) => (
          <rect key={`${i}${j}`} x={4 + i * 11} y={6 + j * 11} width="10" height="10" rx="2.2" {...stroke}
            fill={i === 0 && j === 0 ? ACC : "currentColor"} fillOpacity={i === 0 && j === 0 ? 0.9 : 0.1}
            stroke={i === 0 && j === 0 ? ACC : "currentColor"} />
        )),
      )}
    </svg>
  );
}

/** Pavé d'alignement : le tiroir et la grille poussée vers une position. */
export function AlignArt({ pos, className }: P & { pos: Align }) {
  const col = pos.includes("l") ? 0 : pos.includes("r") ? 2 : 1;
  const row = pos.startsWith("t") ? 0 : pos.startsWith("b") ? 2 : 1;
  const gx = 3 + col * 4;
  const gy = 3 + row * 3;
  return (
    <svg viewBox="0 0 28 22" className={className} aria-hidden fill="none">
      <rect x="0.75" y="0.75" width="26.5" height="20.5" rx="3" stroke="currentColor" strokeOpacity={0.4} strokeWidth={1.2} />
      <g transform={`translate(${gx} ${gy})`}>
        <rect width="14" height="10" rx="1.6" fill={ACC} fillOpacity={0.18} stroke={ACC} strokeWidth={1.2} />
        <path d="M7 0 V10 M0 5 H14" stroke={ACC} strokeWidth={1} />
      </g>
    </svg>
  );
}

/** Marque provisoire « Pocketfit » : une poche vue de dessus, pentes à 45° aux coins. */
export function PocketMark({ className }: P) {
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden fill="none">
      <rect x="1.5" y="1.5" width="25" height="25" rx="6" stroke="currentColor" strokeWidth={2} />
      <rect x="8" y="8" width="12" height="12" rx="2.5" fill="var(--accent)" />
      <path d="M4.2 4.2 L8.8 8.8 M23.8 4.2 L19.2 8.8 M4.2 23.8 L8.8 19.2 M23.8 23.8 L19.2 19.2" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}

/** Buse d'imprimante (profil d'impression). */
export function NozzleIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" {...stroke} strokeWidth={1.6}>
      <path d="M7 3.5 H17 V9 H7 Z" />
      <path d="M9 9 V12 L12 15.5 L15 12 V9" />
      <path d="M5 20.5 H19 M8 18 H16" strokeOpacity={0.5} />
    </svg>
  );
}

/* Petites icônes de famille (utilisées par la direction B). */
export function SizeIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" {...stroke} strokeWidth={1.6}>
      <rect x="4" y="7" width="16" height="12" rx="2" />
      <path d="M4 3.5 H20 M4 2 V5 M20 2 V5" />
    </svg>
  );
}
export function AlignIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" {...stroke} strokeWidth={1.6}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <rect x="6.5" y="7.5" width="7" height="5" rx="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
export function ProfileIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" {...stroke} strokeWidth={1.6}>
      <path d="M2 6 H6 L9.5 9.5 V13.5 L14 18 H22" />
      <path d="M2 21 H22" strokeOpacity={0.45} />
    </svg>
  );
}
export function MagnetIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" {...stroke} strokeWidth={1.6}>
      <ellipse cx="12" cy="8.5" rx="7.5" ry="3" />
      <path d="M4.5 8.5 V14 C4.5 15.7 7.9 17 12 17 C16.1 17 19.5 15.7 19.5 14 V8.5" />
    </svg>
  );
}
export function ScrewIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" {...stroke} strokeWidth={1.6}>
      <path d="M5 4 H19 L15 8 H9 Z" />
      <path d="M9.5 8 V18 L12 21 L14.5 18 V8 M9.5 11.5 L14.5 10.5 M9.5 15 L14.5 14" />
    </svg>
  );
}
export function AdvancedIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none" {...stroke} strokeWidth={1.6}>
      <path d="M4 7 H20 M4 17 H20" strokeOpacity={0.5} />
      <circle cx="9" cy="7" r="2.4" fill="currentColor" />
      <circle cx="15" cy="17" r="2.4" fill="currentColor" />
    </svg>
  );
}
