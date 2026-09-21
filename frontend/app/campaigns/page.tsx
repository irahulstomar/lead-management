"use client";

import { useEffect, useState } from "react";
import { Megaphone, Flame, CheckCircle2 } from "lucide-react";
import { Page, StatTile, Chip } from "@/components/Page";
import { getCampaigns, type Campaign, type CampaignTotals } from "@/lib/api";

const usd = (n: number | null) =>
  n === null ? "—" : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (f: number | null) => (f === null ? "—" : `${(f * 100).toFixed(2)}%`);

export default function CampaignsPage() {
  const [rows, setRows] = useState<Campaign[]>([]);
  const [totals, setTotals] = useState<CampaignTotals | null>(null);

  useEffect(() => {
    getCampaigns()
      .then((r) => {
        setRows(r.campaigns);
        setTotals(r.totals);
      })
      .catch(() => {});
  }, []);

  return (
    <Page
      kicker="Northbeam Partners"
      title="Campaigns"
      subtitle="Meta lead-ad campaigns, with what each one produced after the lead arrived — the number an ads dashboard can't show you. Seeded for the demo; a live account would sync through the Meta Marketing API."
      wide
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Spend to date" value={usd(totals?.spend ?? 0)} />
        <StatTile label="Leads from ads" value={totals?.leads ?? "—"} />
        <StatTile label="Avg cost per lead" value={usd(totals?.cpl ?? null)} />
        <StatTile
          label="Cost per booked call"
          value={usd(totals?.cost_per_booked ?? null)}
          sub={totals?.booked ? `${totals.booked} booked` : "none booked yet"}
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-well">
        <table className="w-full min-w-[860px] text-left">
          <thead>
            <tr className="border-b border-line text-[11px] tracking-wide text-muted uppercase">
              <th className="px-4 py-3 font-medium">Campaign</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Spend</th>
              <th className="px-4 py-3 text-right font-medium">CTR</th>
              <th className="px-4 py-3 text-right font-medium">Leads</th>
              <th className="px-4 py-3 text-right font-medium">Cost / lead</th>
              <th className="px-4 py-3 font-medium">Pipeline</th>
              <th className="px-4 py-3 text-right font-medium">Cost / booked</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((c) => {
              return (
                <tr key={c.id} className="hover:bg-hover">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <Megaphone size={15} className="shrink-0 text-faint" />
                      <div className="min-w-0">
                        <span className="text-[13px] font-medium text-ink">{c.name}</span>
                        <span className="block text-[11px] text-muted capitalize">{c.platform}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    {c.status === "active" ? (
                      <Chip tone="green">Active</Chip>
                    ) : (
                      <Chip tone="muted">Paused</Chip>
                    )}
                  </td>
                  <td className="tnum px-4 py-3.5 text-right text-[13px] text-ink">
                    {usd(c.spend)}
                    <span className="ml-1 text-[11px] text-muted">/ {usd(c.daily_budget)}d</span>
                  </td>
                  <td className="tnum px-4 py-3.5 text-right text-[13px] text-ink">{pct(c.ctr)}</td>
                  <td className="tnum px-4 py-3.5 text-right text-[13px] text-ink">{c.lead_count}</td>
                  <td className="tnum px-4 py-3.5 text-right text-[13px] text-ink">{usd(c.cpl)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {c.replied > 0 && (
                        <Chip tone="ember" icon={Flame}>
                          {c.replied} replied
                        </Chip>
                      )}
                      {c.booked > 0 && (
                        <Chip tone="green" icon={CheckCircle2}>
                          {c.booked} booked
                        </Chip>
                      )}
                      {c.replied === 0 && c.booked === 0 && (
                        <span className="text-[12px] text-muted">no outcomes</span>
                      )}
                    </div>
                  </td>
                  <td className="tnum px-4 py-3.5 text-right text-[13px] font-medium text-ink">
                    {usd(c.cost_per_booked)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-muted">
        Cost per lead is what every ads dashboard reports. Cost per booked call is what actually
        matters — Baton can compute it because it knows what happened to each lead after the click.
        A campaign with no bookings shows “—”, never a flattering zero.
      </p>
    </Page>
  );
}
