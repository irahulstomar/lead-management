"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  BarChart3,
  Users,
  Building2,
  Mail,
  Bell,
  Settings,
  PanelLeftClose,
  ChevronRight,
  BookOpen,
} from "lucide-react";

// Every item is a real, read-only page. The pipeline lives at /leads; /dashboard is
// the overview. Only the landing-page form (Phase 3) reaches outside — the rest read
// seeded data. An item without an href would render as an inert span; none do now.
const MAIN = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Campaigns", icon: Target, href: "/campaigns" },
  { label: "Analytics", icon: BarChart3, href: "/analytics" },
  { label: "Leads", icon: Users, href: "/leads" },
  { label: "Playbook", icon: BookOpen, href: "/playbook" },
  { label: "Organization", icon: Building2, href: "/organization" },
  { label: "Email", icon: Mail, href: "/email" },
];

const OTHER = [
  { label: "Notifications", icon: Bell, href: "/notifications" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

type Item = { label: string; icon: React.ElementType; href?: string };

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-line bg-panel">
      <div className="flex items-center gap-2 px-5 pt-6 pb-5">
        {/* The mark is a baton mid-pass: one hand lets go, the next takes hold. */}
        <span className="grid size-[22px] place-items-center rounded-full bg-blue/10">
          <span className="h-[11px] w-[3px] rotate-45 rounded-full bg-blue" />
        </span>
        <span className="text-[15px] font-semibold tracking-tight text-ink">Baton</span>
        <PanelLeftClose size={15} className="ml-auto text-faint" />
      </div>

      <Group label="Main" items={MAIN} pathname={pathname} />
      <div className="mx-5 my-3 border-t border-line" />
      <Group label="Other" items={OTHER} pathname={pathname} />

      {/* Baton is the product. Northbeam Partners is the agency using it. */}
      <div className="mt-auto border-t border-line px-4 py-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-active text-[10px] font-semibold text-muted">
            JE
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-ink">Jordan Ellis</p>
            <p className="truncate text-[11px] text-muted">Northbeam Partners</p>
          </div>
          <ChevronRight size={15} className="shrink-0 text-faint" />
        </div>
      </div>
    </aside>
  );
}

function Group({
  label,
  items,
  pathname,
}: {
  label: string;
  items: Item[];
  pathname: string;
}) {
  return (
    <div className="px-3">
      <p className="px-2 pb-1.5 text-[10px] font-medium tracking-wider text-muted uppercase">
        {label}
      </p>
      <nav className="flex flex-col gap-0.5">
        {items.map(({ label, icon: Icon, href }) => {
          const active = href !== undefined && pathname === href;
          const cls = `flex items-center gap-2.5 rounded-lg px-2 py-[7px] text-[13px] ${
            active
              ? "bg-active font-medium text-ink"
              : href
                ? "text-muted hover:bg-hover hover:text-ink"
                : "cursor-default text-muted hover:bg-hover"
          }`;
          const inner = (
            <>
              <Icon size={15} className={active ? "text-ink" : "text-faint"} />
              {label}
            </>
          );
          return href ? (
            <Link key={label} href={href} className={cls}>
              {inner}
            </Link>
          ) : (
            <span key={label} className={cls}>
              {inner}
            </span>
          );
        })}
      </nav>
    </div>
  );
}
