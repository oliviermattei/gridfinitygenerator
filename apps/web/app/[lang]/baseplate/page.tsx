import type { Metadata } from "next";
import { BaseplateGenerator } from "@/components/baseplate-generator";

export const metadata: Metadata = {
  title: "Générateur de baseplates",
  description:
    "Générateur gratuit et open source de baseplates Gridfinity à la mesure de votre tiroir, calculées dans le navigateur.",
};

// First end-to-end flow (#4): cell counts, 3D preview, STL download. The Studio interface arrives with #6.
export default function BaseplatePage() {
  return <BaseplateGenerator />;
}
