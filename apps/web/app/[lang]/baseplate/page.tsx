import type { Metadata } from "next";
import { BaseplateGenerator } from "@/components/baseplate-generator";

export const metadata: Metadata = {
  title: "Générateur de baseplates",
  description:
    "Générateur gratuit et open source de baseplates Gridfinity à la mesure de votre tiroir, calculées dans le navigateur.",
};

// Studio interface (#6): full-screen 3D preview, floating settings panel, top bar.
export default function BaseplatePage() {
  return <BaseplateGenerator />;
}
