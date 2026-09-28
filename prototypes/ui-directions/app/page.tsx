"use client";
// PROTOTYPE JETABLE — « 3 directions visuelles de l'écran du générateur de baseplates,
// switchables via ?variant=A|B|C sur une seule route ». Voir README.md.
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSettings } from "@/lib/settings";
import { PrototypeSwitcher } from "@/components/PrototypeSwitcher";
import { DebugPanel } from "@/components/DebugPanel";
import VariantA from "@/variants/VariantA";
import VariantB from "@/variants/VariantB";
import VariantC from "@/variants/VariantC";

const VARIANTS = [
  { key: "A", name: "Nuancier" },
  { key: "B", name: "Établi" },
  { key: "C", name: "Blocs" },
];

function Screen() {
  const params = useSearchParams();
  const variant = params.get("variant") ?? "A";
  const ctx = useSettings();
  return (
    <>
      {variant === "A" && <VariantA {...ctx} />}
      {variant === "B" && <VariantB {...ctx} />}
      {variant === "C" && <VariantC {...ctx} />}
      <DebugPanel s={ctx.s} layout={ctx.layout} variant={variant} />
      <PrototypeSwitcher variants={VARIANTS} />
    </>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Screen />
    </Suspense>
  );
}
