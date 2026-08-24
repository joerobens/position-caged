"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHalf, Moon, Sun, UserCircle } from "@phosphor-icons/react";
import { useSettings } from "@/hooks/useSettings";
import { useTheme } from "@/hooks/useTheme";
import { useSession } from "@/hooks/useSession";
import { syncConfigured } from "@/lib/supabase";
import type { ThemePreference } from "@/lib/theme";

const LINKS = [
  { href: "/play", label: "Play" },
  { href: "/songs", label: "Songs" },
  { href: "/sets", label: "Sets" },
  { href: "/theory", label: "Theory" },
  { href: "/classic/index.html", label: "Classic", external: true },
];

const THEME_ORDER: ThemePreference[] = ["system", "light", "dark"];
const THEME_LABEL: Record<ThemePreference, string> = {
  system: "Theme: following the system",
  light: "Theme: light",
  dark: "Theme: dark",
};

/** One bar across the reading pages. The tool has its own, because it cannot spare the height. */
export default function SiteNav({ sticky = true }: { sticky?: boolean } = {}) {
  const pathname = usePathname();
  const { settings, update } = useSettings();
  useTheme(settings.theme);
  const { session, ready } = useSession();
  const Icon = settings.theme === "light" ? Sun : settings.theme === "dark" ? Moon : CircleHalf;

  return (
    <header className={`${sticky ? "sticky top-0 z-30" : ""} border-b border-line bg-panel/95 backdrop-blur`}>
      <nav
        className="mx-auto flex h-12 max-w-[1180px] items-center gap-5 px-[var(--gutter)] sm:h-14"
        aria-label="Site"
      >
        <Link href="/" className="text-[15px] font-bold tracking-tight text-bone">
          Position
        </Link>
        <div className="flex items-center gap-4 overflow-x-auto">
          {LINKS.map((link) => {
            const active = !link.external && pathname.startsWith(link.href);
            const className = `whitespace-nowrap border-b-2 py-1.5 text-sm transition-colors ${
              active ? "border-b-[color:var(--accent)] text-bone" : "border-transparent text-bone-dim hover:text-bone"
            }`;
            return link.external ? (
              <a key={link.href} href={link.href} className={className}>
                {link.label}
              </a>
            ) : (
              <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined} className={className}>
                {link.label}
              </Link>
            );
          })}
        </div>
        {/* Signing in was buried at the foot of one page, which is the same as not
            being there. It belongs where you would look for it. */}
        {syncConfigured ? (
          <Link
            href="/account"
            aria-label={session ? `Signed in as ${session.user.email}` : "Sign in"}
            className="chip ml-auto flex flex-none items-center gap-2 px-3"
          >
            <UserCircle size={17} weight={session ? "fill" : "bold"} style={session ? { color: "var(--accent)" } : undefined} />
            <span className="hidden text-[13px] sm:inline">{!ready ? "\u2026" : session ? "Synced" : "Sign in"}</span>
          </Link>
        ) : null}
        <button
          type="button"
          className={`chip ${syncConfigured ? "" : "ml-auto"} flex flex-none items-center justify-center px-3`}
          aria-label={THEME_LABEL[settings.theme]}
          title={THEME_LABEL[settings.theme]}
          onClick={() =>
            update({ theme: THEME_ORDER[(THEME_ORDER.indexOf(settings.theme) + 1) % THEME_ORDER.length] })
          }
        >
          <Icon size={17} weight="bold" />
        </button>
      </nav>
    </header>
  );
}
