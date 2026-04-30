"use client";

import { use } from "react";
import Game from "@/components/Game";
import AuthGate from "@/components/AuthGate";

export default function AlbumGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <AuthGate>
      <Game mode="album" albumId={id} />
    </AuthGate>
  );
}
