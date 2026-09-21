"use client";

import {
  ChevronDown,
  FastForward,
  Loader2,
  List,
  LayoutGrid,
  Clock,
  Hand,
  Flame,
  CheckCircle2,
  Ban,
  Snowflake,
  Mail,
} from "lucide-react";
import { initials, statusChip, TONE_CLASS, type Lead } from "@/lib/status";

export function LeadList({
  leads,
  selectedId,
  advancing,
  onSelect,
  onAdvance,
}: {
  leads: Lead[];
  selectedId: number | null;
  advancing: boolean;
  onSelect: (id: number) => void;
  onAdvance: () => void;
}) {
  return (
    <section className="flex w-[420px] shrink-0 flex-col border-r border-line bg-panel">
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <h1 className="text-[20px] font-semibold tracking-tight text-ink">Leads</h1>
        <button
          onClick={onAdvance}
          disabled={advancing}
          className="flex items-center gap-1.5 rounded-lg bg-blue px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-blue-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-blue/40 disabled:opacity-60"
        >
          {advancing ? <Loader2 size={14} className="animate-spin" /> : <FastForward size={14} />}
          {advancing ? "Drafting…" : "Advance day"}
        </button>
      </div>

      <div className="flex items-center gap-2 px-5 pb-4">
        <Pill label="Filter By" />
        <Pill label="A-Z" />
        <div className="ml-auto flex items-center rounded-lg border border-line-strong">
          <span className="grid size-[30px] place-items-center rounded-l-lg bg-active">
            <List size={14} className="text-ink" />
          </span>
          <span className="grid size-[30px] place-items-center">
            <LayoutGrid size={14} className="text-faint" />
          </span>
        </div>
      </div>

      <div className="scroll-quiet flex-1 overflow-y-auto">
        {leads.map((lead) => (
          <button
            key={lead.id}
            onClick={() => onSelect(lead.id)}
            className={`flex w-full items-center gap-3 border-b border-line px-5 py-3.5 text-left transition-colors ${
              selectedId === lead.id ? "bg-active" : "hover:bg-hover"
            }`}
          >
            <Avatar name={lead.name} size={36} />
            <div className="w-[132px] shrink-0">
              <p className="truncate text-[13px] font-semibold text-ink">{lead.name}</p>
              <p className="truncate text-[12px] text-muted">{lead.company}</p>
            </div>
            <div className="flex min-w-0 flex-1 flex-col items-end gap-1">
              <StatusChip lead={lead} />
              <p className="w-full truncate text-right text-[12px] text-muted">{lead.email}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <span className="flex cursor-default items-center gap-1.5 rounded-lg border border-line-strong px-2.5 py-1.5 text-[12px] font-medium text-ink">
      {label}
      <ChevronDown size={13} className="text-faint" />
    </span>
  );
}

const ICON: Record<string, React.ElementType> = {
  "Awaiting decision": Clock,
  "Worked by Jordan": Hand,
  Replied: Flame,
  Booked: CheckCircle2,
  "Opted out": Ban,
  Cold: Snowflake,
  Contacted: Mail,
};

function StatusChip({ lead }: { lead: Lead }) {
  const { label, tone } = statusChip(lead);
  const Icon = ICON[label];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${TONE_CLASS[tone]}`}
    >
      {Icon && <Icon size={10} />}
      {label}
    </span>
  );
}

export function Avatar({ name, size }: { name: string; size: number }) {
  // The reference uses photographs. These leads are fictional, so a monogram is
  // the honest equivalent — inventing faces for them would be worse.
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-active font-semibold text-muted"
      style={{ width: size, height: size, fontSize: size * 0.3 }}
    >
      {initials(name)}
    </span>
  );
}
