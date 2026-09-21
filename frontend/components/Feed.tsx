import Link from "next/link";
import { Flame, BellRing, StickyNote, Mail, CircleDot } from "lucide-react";
import { TOUCH_LABEL, touchTone, type TouchKind } from "@/lib/status";
import type { ActivityItem } from "@/lib/api";

const ICON: Record<TouchKind, React.ElementType> = {
  instant_reply: Mail,
  follow_up_1: Mail,
  follow_up_2: Mail,
  follow_up_3: Mail,
  inbound_reply: Flame,
  hot_alert: Flame,
  owner_alert: BellRing,
  note: StickyNote,
  event: CircleDot,
};

const DOT: Record<string, string> = {
  ember: "bg-ember/10 text-ember",
  blue: "bg-blue/10 text-blue",
  amber: "bg-amber-soft text-amber",
  neutral: "bg-active text-muted",
};

const HEAD: Record<string, string> = {
  ember: "text-ember",
  blue: "text-blue",
  amber: "text-amber",
  neutral: "text-ink",
};

/** One cross-lead feed, shared by the overview and the notifications page. Every row
 *  deep-links to the lead it happened on, so a feed entry is always one click from context. */
export function Feed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return <p className="px-5 py-8 text-center text-[13px] text-muted">Nothing here yet.</p>;
  }
  return (
    <ul className="divide-y divide-line">
      {items.map((t) => {
        const tone = touchTone(t.kind);
        const Icon = ICON[t.kind];
        return (
          <li key={t.id}>
            <Link
              href={`/leads?lead=${t.lead_id}`}
              className="flex gap-3 px-5 py-3.5 transition-colors hover:bg-hover"
            >
              <span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ${DOT[tone]}`}>
                <Icon size={13} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className={`text-[12px] font-semibold ${HEAD[tone]}`}>
                    {TOUCH_LABEL[t.kind]}
                  </span>
                  <span className="truncate text-[12px] text-muted">
                    {t.lead_name}
                    {t.lead_company ? ` · ${t.lead_company}` : ""}
                  </span>
                  <span className="ml-auto shrink-0 text-[11px] text-faint">Day {t.day}</span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-muted">{t.body}</p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
