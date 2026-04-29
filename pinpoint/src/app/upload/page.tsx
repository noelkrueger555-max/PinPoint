"use client";

import PhotoUpload from "@/components/PhotoUpload";
import PageHeader from "@/components/PageHeader";
import AuthGate from "@/components/AuthGate";

export default function UploadPage() {
  return (
    <AuthGate reason={<>Lade Fotos hoch — sicher in deinem <em className="accent-italic">Account</em>.</>}>
      <PageHeader />
      <main className="max-w-[1280px] mx-auto px-6 md:px-8 pt-8 pb-20 relative z-[2]">
        <div className="dashed-pill mb-3">📥 Foto-Bibliothek</div>
        <h1 className="font-display-wonk font-black text-[clamp(40px,6vw,72px)] leading-[0.95] tracking-[-0.04em]">
          Fotos <em className="accent-italic">hochladen</em>
        </h1>
        <p className="text-ink-soft mt-3 text-lg max-w-[600px]">
          Deine Fotos werden verschlüsselt in der Cloud gespeichert. Wo möglich,
          lesen wir die GPS-Position aus den EXIF-Daten — sonst setzt du den
          Pin manuell auf der Karte.
        </p>
        <div className="mt-10">
          <PhotoUpload />
        </div>
      </main>
    </AuthGate>
  );
}
