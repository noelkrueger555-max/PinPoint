"use client";

import { Suspense, useEffect, useState } from "react";
import Game from "@/components/Game";
import AuthGate from "@/components/AuthGate";

function LaneInner() {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setId(params.get("id"));
  }, []);
  if (!id) {
    return (
      <div className="flex items-center justify-center h-screen text-slate-400">
        Lane wird geladen…
      </div>
    );
  }
  return <Game mode="lane" laneId={id} />;
}

export default function LaneGame() {
  return (
    <AuthGate>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-screen text-slate-400">
            Lade…
          </div>
        }
      >
        <LaneInner />
      </Suspense>
    </AuthGate>
  );
}
