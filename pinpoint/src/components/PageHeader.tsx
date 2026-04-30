"use client";

import Link from "next/link";
import AuthMenu from "./AuthMenu";

interface Props {
  title?: string;
  rightSlot?: React.ReactNode;
}

export default function PageHeader({ rightSlot }: Props) {
  return (
    <header className="max-w-[1280px] mx-auto px-4 md:px-8 pt-4 md:pt-7 pb-4 md:pb-5 flex items-center justify-between relative z-10 gap-3">
      <Link
        href="/"
        className="flex items-center gap-2 md:gap-2.5 font-display text-[20px] md:text-[26px] font-black tracking-tight text-ink no-underline"
      >
        <span className="logo-mark" />
        <span>PinPoint</span>
      </Link>
      <nav className="hidden md:flex gap-7 list-none text-sm font-medium tracking-wide items-center">
        <Link href="/play" className="text-ink-soft hover:text-pin no-underline border-b border-dashed border-transparent hover:border-pin pb-0.5 transition-colors">Spielen</Link>
        <Link href="/albums" className="text-ink-soft hover:text-pin no-underline border-b border-dashed border-transparent hover:border-pin pb-0.5 transition-colors">Alben</Link>
        <Link href="/duel" className="text-ink-soft hover:text-pin no-underline border-b border-dashed border-transparent hover:border-pin pb-0.5 transition-colors">Duell</Link>
        <Link href="/friends" className="text-ink-soft hover:text-pin no-underline border-b border-dashed border-transparent hover:border-pin pb-0.5 transition-colors">Freunde</Link>
        <Link href="/leaderboard" className="text-ink-soft hover:text-pin no-underline border-b border-dashed border-transparent hover:border-pin pb-0.5 transition-colors">Ranking</Link>
        <Link href="/stats" className="text-ink-soft hover:text-pin no-underline border-b border-dashed border-transparent hover:border-pin pb-0.5 transition-colors">Stats</Link>
        <Link href="/achievements" className="text-ink-soft hover:text-pin no-underline border-b border-dashed border-transparent hover:border-pin pb-0.5 transition-colors">Erfolge</Link>
      </nav>
      <div className="flex items-center gap-2 md:gap-3">
        {rightSlot}
        <AuthMenu />
      </div>
    </header>
  );
}
