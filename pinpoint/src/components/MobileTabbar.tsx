"use client";

/**
 * Mobile bottom-tab navigation. Only visible at < md (handled by CSS).
 * Mirrors the desktop nav in PageHeader but compact + thumb-reachable.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Play,
  BookImage,
  Upload,
  Users,
  Trophy,
} from "lucide-react";

const TABS = [
  { href: "/play", label: "Spielen", Icon: Play },
  { href: "/albums", label: "Alben", Icon: BookImage },
  { href: "/upload", label: "Upload", Icon: Upload },
  { href: "/friends", label: "Freunde", Icon: Users },
  { href: "/leaderboard", label: "Rang", Icon: Trophy },
];

export default function MobileTabbar() {
  const pathname = usePathname() ?? "/";
  // Hide tabbar in fullscreen game / duel views to avoid overlaying the
  // map controls or stealing thumb-space from the guess button.
  const hidden =
    pathname.startsWith("/play/album/") ||
    pathname.startsWith("/play/lobby") ||
    pathname.startsWith("/duel/");
  if (hidden) return null;
  return (
    <nav className="mobile-tabbar" aria-label="Hauptnavigation">
      {TABS.map(({ href, label, Icon }) => {
        const active =
          pathname === href ||
          (href !== "/" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            data-active={active}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="w-5 h-5" aria-hidden />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
