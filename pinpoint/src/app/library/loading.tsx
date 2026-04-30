import PageHeader from "@/components/PageHeader";

export default function Loading() {
  return (
    <>
      <PageHeader />
      <main className="max-w-[1280px] mx-auto px-6 md:px-8 pt-8 pb-20 relative z-[2]">
        <div className="dashed-pill mb-3 animate-pulse">▴ Lädt …</div>
        <div className="paper-card-soft h-12 max-w-[480px] animate-pulse mb-8" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="paper-card aspect-square animate-pulse"
              style={{
                opacity: 0.5,
                transform: `rotate(${((i % 5) - 2) * 0.4}deg)`,
                background: "var(--paper-deep, #f0ead8)",
              }}
            />
          ))}
        </div>
      </main>
    </>
  );
}
