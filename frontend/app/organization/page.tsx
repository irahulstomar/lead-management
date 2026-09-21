"use client";

import { useEffect, useState } from "react";
import { Globe, Megaphone, PhoneMissed, Mail } from "lucide-react";
import { Page, Panel, Chip } from "@/components/Page";
import { getLeads } from "@/lib/api";
import { SOURCE_LABEL, type Lead } from "@/lib/status";

const SOURCES: { source: Lead["source"]; icon: React.ElementType; real: boolean; note: string }[] = [
  { source: "website_form", icon: Globe, real: true, note: "Live — the landing-page form sends a real email via Resend." },
  { source: "lead_ad", icon: Megaphone, real: false, note: "Seeded. A live account would sync through the Meta Marketing API." },
  { source: "missed_call", icon: PhoneMissed, real: false, note: "Seeded. Would arrive from a telephony webhook in production." },
  { source: "email_inquiry", icon: Mail, real: false, note: "Seeded. Would arrive from an inbound-email parser in production." },
];

export default function OrganizationPage() {
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    getLeads().then((r) => setLeads(r.leads)).catch(() => {});
  }, []);

  const count = (s: Lead["source"]) => leads.filter((l) => l.source === s).length;

  return (
    <Page
      kicker="Northbeam Partners"
      title="Organization"
      subtitle="Who runs Baton, and where the leads come from. One operator, four sources — one of them real."
    >
      <div className="space-y-4">
        <Panel bodyClass="p-5">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-blue/10 text-[15px] font-semibold text-blue">
              NP
            </span>
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Northbeam Partners</h2>
              <p className="mt-0.5 text-[13px] text-muted">US B2B service agency · outbound &amp; lead follow-up</p>
              <p className="mt-2.5 max-w-[560px] text-[13px] leading-relaxed text-muted">
                A small agency that lives or dies on how fast it answers an inbound lead. Baton is
                the engine behind that: a human takes the first leg, the AI runs the rest, nobody
                drops the baton.
              </p>
            </div>
          </div>
        </Panel>

        <Panel title="Operator" bodyClass="p-5">
          <div className="flex items-center gap-3.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-active text-[13px] font-semibold text-muted">
              JE
            </span>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-ink">Jordan Ellis</p>
              <p className="text-[12px] text-muted">Owner — signs every message, claims the hot ones</p>
            </div>
            <Chip tone="blue">Single operator</Chip>
          </div>
          <p className="mt-3 border-t border-line pt-3 text-[12px] leading-relaxed text-muted">
            Baton is a single-operator tool by design — no team accounts, no roles, no login. The
            AI is the safety net for one busy person, not a seat in a CRM.
          </p>
        </Panel>

        <Panel title="Connected lead sources" bodyClass="">
          <ul className="divide-y divide-line">
            {SOURCES.map(({ source, icon: Icon, real, note }) => (
              <li key={source} className="flex items-center gap-3.5 px-5 py-3.5">
                <Icon size={16} className="shrink-0 text-faint" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-ink">{SOURCE_LABEL[source]}</span>
                    {real ? <Chip tone="green">Live</Chip> : <Chip tone="muted">Seeded</Chip>}
                  </div>
                  <p className="mt-0.5 text-[12px] text-muted">{note}</p>
                </div>
                <span className="tnum shrink-0 text-[13px] font-semibold text-ink">
                  {count(source)}
                  <span className="ml-1 text-[11px] font-normal text-muted">leads</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </Page>
  );
}
