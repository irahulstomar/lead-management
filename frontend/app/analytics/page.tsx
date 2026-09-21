"use client";

import { useEffect, useState } from "react";
import { Page, Panel, Bar } from "@/components/Page";
import { getAnalytics, type Analytics } from "@/lib/api";
import { SOURCE_LABEL } from "@/lib/status";

// Colour only where it means something: waiting, replied, booked. The rest stays quiet.
const STATE_COLOR: Record<string, string> = {
  "Awaiting a human": "var(--amber)",
  "In sequence": "var(--line-strong)",
  "Human-owned": "var(--blue)",
  Replied: "var(--ember)",
  Booked: "var(--green)",
  Cold: "var(--faint)",
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    getAnalytics().then(setData).catch(() => {});
  }, []);

  const total = data?.total_leads ?? 0;
  // funnel[0] is "Arrived" (the total); the rest are the current-state buckets.
  const states = data?.funnel.slice(1) ?? [];
  const maxSource = Math.max(1, ...(data?.by_source.map((s) => s.leads) ?? [0]));

  return (
    <Page
      kicker="Northbeam Partners"
      title="Analytics"
      subtitle={`Where the ${total || "—"} leads in the system are now, and where they came from. Counts, not rates — at this sample size a reply-rate chart would be noise dressed as insight, so it isn't here.`}
      wide
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Where every lead is now" bodyClass="space-y-3.5 px-5 py-5">
          {states.map((s) => (
            <Bar
              key={s.stage}
              label={s.stage}
              value={s.count}
              frac={total ? s.count / total : 0}
              color={STATE_COLOR[s.stage] ?? "var(--line-strong)"}
              hint={total ? `${Math.round((s.count / total) * 100)}%` : undefined}
            />
          ))}
          <p className="border-t border-line pt-3 text-[12px] text-muted">
            {total} leads arrived in total across all sources.
          </p>
        </Panel>

        <Panel title="By source" bodyClass="space-y-3.5 px-5 py-5">
          {(data?.by_source ?? []).map((s) => (
            <Bar
              key={s.source}
              label={SOURCE_LABEL[s.source]}
              value={s.leads}
              frac={s.leads / maxSource}
              color="var(--blue)"
              hint={
                s.replied || s.booked
                  ? [s.replied && `${s.replied} replied`, s.booked && `${s.booked} booked`]
                      .filter(Boolean)
                      .join(" · ")
                  : undefined
              }
            />
          ))}
          <p className="border-t border-line pt-3 text-[12px] text-muted">
            Only the website form is a live integration today. The other three sources are seeded.
          </p>
        </Panel>
      </div>
    </Page>
  );
}
