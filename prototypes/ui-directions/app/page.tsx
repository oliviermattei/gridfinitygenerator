"use client";
// PROTOTYPE JETABLE — v3 : direction « Studio » retenue, retravaillée (panneau à gauche, accordéon
// exclusif, menu Préférences). Voir README.md.
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useSettings } from "@/lib/settings";
import { DebugPanel } from "@/components/DebugPanel";
import Studio from "@/variants/VariantB";

function Screen() {
  const params = useSearchParams();
  const ctx = useSettings();
  const { set } = ctx;
  // Raccourcis de capture : ?magnets&screws&release&lang=en
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
      <Studio {...ctx} />
      <DebugPanel s={ctx.s} layout={ctx.layout} variant="Studio" />
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
