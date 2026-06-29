"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  sub: string;
  icon: React.ReactNode;
  badge?: string;
}

const NAV: NavItem[] = [
  {
    href: "/",
    label: "Home",
    sub: "This Week",
    icon: <HomeIcon />,
  },
  {
    href: "/goals",
    label: "Goals",
    sub: "Targets & gaps",
    icon: <TargetIcon />,
  },
  {
    href: "/generator",
    label: "Generator",
    sub: "Email & flow HTML",
    icon: <BoltIcon />,
    badge: "Soon",
  },
  {
    href: "/popups",
    label: "Popups & Images",
    sub: "Copy + on-brand art",
    icon: <ImageIcon />,
    badge: "Soon",
  },
  {
    href: "/plan",
    label: "Plan",
    sub: "Full roadmap",
    icon: <MapIcon />,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-black/[0.06] bg-navy text-white md:flex">
      <div className="px-6 pb-6 pt-7">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent font-bold tracking-tight">
            PPW
          </div>
          <div className="leading-tight">
            <div className="text-base font-semibold">PPW Command</div>
            <div className="text-xs text-white/55">Peak Primal Wellness</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                active
                  ? "bg-white/[0.12] text-white"
                  : "text-white/70 hover:bg-white/[0.06] hover:text-white",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-9 w-9 items-center justify-center rounded-lg",
                  active ? "bg-accent text-white" : "bg-white/[0.06] text-white/80",
                ].join(" ")}
              >
                {item.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {item.label}
                  {item.badge && (
                    <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/70">
                      {item.badge}
                    </span>
                  )}
                </span>
                <span className="block truncate text-xs text-white/45">
                  {item.sub}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-6 text-xs text-white/40">
        Trailing 12 mo snapshot · v1
      </div>
    </aside>
  );
}

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5 12 3l9 6.5" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}
function TargetIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </svg>
  );
}
function BoltIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  );
}
function ImageIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="m21 16-5-5L5 20" />
    </svg>
  );
}
function MapIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  );
}
