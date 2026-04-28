"use client";

import PhotoUpload from "@/components/PhotoUpload";
import PageHeader from "@/components/PageHeader";

export default function UploadPage() {
  return (
    <>
      <PageHeader />
      <main className="max-w-[1280px] mx-auto px-6 md:px-8 pt-8 pb-20 relative z-[2]">
        <div className="dashed-pill mb-3">📥 Lokal · privat</div>
        <h1 className="font-display-wonk font-black text-[clamp(40px,6vw,72px)] leading-[0.95] tracking-[-0.04em]">
          Fotos <em className="accent-italic">hochladen</em>
        </h1>
        <p className="text-ink-soft mt-3 text-lg max-w-[600px]">
          Werden lokal in deinem Browser gespeichert (IndexedDB). Wo möglich,
          lesen wir die GPS-Position aus den EXIF-Daten — sonst setzt du den
          Pin manuell auf der Karte.
        </p>
        <div className="mt-10">
          <PhotoUpload />
        </div>
      </main>
    </>
  );
}
