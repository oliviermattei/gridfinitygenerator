"use client";
// PROTOTYPE JETABLE — v2 : « 2 directions visuelles de l'écran du générateur de baseplates,
// switchables via ?variant=A|B sur une seule route ». Voir README.md.
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSettings } from "@/lib/settings";
import { PrototypeSwitcher } from "@/components/PrototypeSwitcher";
import { DebugPanel } from "@/components/DebugPanel";
import VariantA from "@/variants/VariantA";
import VariantB from "@/variants/VariantB";

const VARIANTS = [
  { key: "A", name: "Calibre" },
  { key: "B", name: "Studio" },
];

function Screen() {
  const params = useSearchParams();
  const variant = params.get("variant") === "B" ? "B" : "A";
  const ctx = useSettings();
  const { set } = ctx;
  // Raccourcis de capture : ?magnets&screws&lang=en&cells
  useEffect(() => {
    set({
      ...(params.has("magnets") ? { magnets: true } : {}),
      ...(params.has("screws") ? { screws: true } : {}),
      ...(params.get("lang") === "en" ? { lang: "en" as const } : {}),
      ...(params.has("release") ? { magnetRelease: true } : {}),
    });
  }, [params, set]);
  return (
    <>
      {variant === "A" && <VariantA {...ctx} />}
      {variant === "B" && <VariantB {...ctx} />}
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
