"use client";

import Link from "next/link";

interface Props {
  title?: string;
  rightSlot?: React.ReactNode;
}

export default function PageHeader({ rightSlot }: Props) {
  return (
    <header className="max-w-[1280px] mx-auto px-6 md:px-8 pt-7 pb-5 flex items-center justify-between relative z-10">
      <Link
        href="/"
        className="flex items-center gap-2.5 font-display text-[22px] md:text-[26px] font-black tracking-tight text-ink no-underline"
      >
        <span className="logo-mark" />
        <span>PinPoint</span>
      </Link>
      <nav className="hidden md:flex gap-7 list-none text-sm font-medium tracking-wide items-center">
        <Link href="/play" className="text-ink-soft hover:text-pin no-underline border-b border-dashed border-transparent hover:border-pin pb-0.5 transition-colors">Spielen</Link>
        <Link href="/lanes" className="text-ink-soft hover:text-pin no-underline border-b border-dashed border-transparent hover:border-pin pb-0.5 transition-colors">Lanes</Link>
        <Link href="/duel" className="text-ink-soft hover:text-pin no-underline border-b border-dashed border-transparent hover:border-pin pb-0.5 transition-colors">Duell</Link>
        <Link href="/leaderboard" className="text-ink-soft hover:text-pin no-underline border-b border-dashed border-transparent hover:border-pin pb-0.5 transition-colors">Ranking</Link>
        <Link href="/stats" className="text-ink-soft hover:text-pin no-underline border-b border-dashed border-transparent hover:border-pin pb-0.5 transition-colors">Stats</Link>
        <Link href="/share" className="text-ink-soft hover:text-pin no-underline border-b border-dashed border-transparent hover:border-pin pb-0.5 transition-colors">Teilen</Link>
      </nav>
      {rightSlot}
    </header>
  );
}
