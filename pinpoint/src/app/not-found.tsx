import Link from "next/link";
import { MapPin, Home } from "lucide-react";
import PageHeader from "@/components/PageHeader";

export default function NotFound() {
  return (
    <>
      <PageHeader />
      <main className="max-w-[760px] mx-auto px-6 md:px-8 pt-16 pb-24 relative z-[2] text-center">
        <div className="dashed-pill mb-4 mx-auto inline-block">🧭 Verlaufen?</div>
        <div
          className="font-display-wonk font-black tracking-[-0.04em] leading-[0.9]"
          style={{ fontSize: "clamp(80px, 14vw, 180px)", color: "var(--pin)" }}
        >
          404
        </div>
        <h1 className="font-display text-2xl md:text-3xl font-bold mt-2">
          Diese Koordinate gibt&apos;s nicht
        </h1>
        <p className="text-ink-soft mt-3 max-w-[420px] mx-auto">
          Vielleicht falsch abgebogen — oder der Pin wurde verschoben. Setz dich neu:
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="btn-primary">
            <Home className="w-4 h-4" />
            Startseite
          </Link>
          <Link href="/play" className="btn-ghost">
            <MapPin className="w-4 h-4" />
            Direkt spielen
          </Link>
        </div>
      </main>
    </>
  );
}
