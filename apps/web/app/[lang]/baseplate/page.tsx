import type { Metadata } from "next";

const TITLE = "Générateur de baseplates";

export const metadata: Metadata = {
  title: TITLE,
  description:
    "Générateur gratuit et open source de baseplates Gridfinity à la mesure de votre tiroir, calculées dans le navigateur.",
};

// Placeholder of the baseplate generator: the Studio interface arrives with #4 and #6.
export default function BaseplatePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-start gap-4 rounded-card bg-surface p-8 shadow-pop">
        <span data-testid="brand-mark" aria-hidden className="size-10 rounded-ctl bg-accent" />
        <h1 className="text-3xl font-semibold tracking-tight">{TITLE}</h1>
        <p className="text-ink-soft">
          Une baseplate Gridfinity à la mesure de votre tiroir, calculée dans votre navigateur.
        </p>
        <p className="text-sm text-muted">En construction.</p>
      </div>
    </main>
  );
}
