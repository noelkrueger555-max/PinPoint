import PageHeader from "@/components/PageHeader";

export default function Loading() {
  return (
    <>
      <PageHeader />
      <main className="max-w-[1100px] mx-auto px-6 md:px-8 pt-8 pb-20 relative z-[2]">
        <div className="dashed-pill mb-3 animate-pulse">🏆 Lädt …</div>
        <div className="paper-card-soft h-16 max-w-[420px] animate-pulse mb-8" />
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="paper-card-soft h-16 animate-pulse"
              style={{
                opacity: 0.6 - i * 0.04,
              }}
            />
          ))}
        </div>
      </main>
    </>
  );
}
