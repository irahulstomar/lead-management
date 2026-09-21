"use client";

import { useEffect, useState } from "react";
import { Page, Panel, StatTile } from "@/components/Page";
import { Feed } from "@/components/Feed";
import {
  getStats,
  getActivity,
  getStatus,
  type Stats,
  type ActivityItem,
  type IntegrationStatus,
} from "@/lib/api";

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [status, setStatus] = useState<IntegrationStatus | null>(null);

  useEffect(() => {
    getStats().then(setStats).catch(() => {});
    getActivity(14).then((r) => setActivity(r.activity)).catch(() => {});
    getStatus().then(setStatus).catch(() => {});
  }, []);

  return (
    <Page
      kicker="Northbeam Partners"
      title="Overview"
      subtitle="Where every lead stands right now, and what the engine has done lately. Nothing here changes a lead — the pipeline is under Leads."
      wide
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="tnum rounded-lg border border-line-strong bg-panel px-2.5 py-1.5 text-[12px] font-medium text-ink">
            Demo day {stats?.current_day ?? "—"}
          </span>
          <Dot on={status?.gemini_configured} label="Gemini" off="offline" />
          <Dot on={status?.resend_configured} label="Resend" off="test path off" />
        </div>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Total leads" value={stats?.total_leads ?? "—"} />
        <StatTile label="Awaiting a human" value={stats?.awaiting_decision ?? "—"} />
        <StatTile label="Worked by Jordan" value={stats?.claimed ?? "—"} />
        <StatTile label="Replied 🔥" value={stats?.hot_leads ?? "—"} />
        <StatTile label="Booked" value={stats?.booked ?? "—"} />
        <StatTile label="Follow-ups sent" value={stats?.follow_ups_sent ?? "—"} />
      </div>

      <div className="mt-4">
        <Panel title="Recent activity" bodyClass="">
          <Feed items={activity} />
        </Panel>
      </div>
    </Page>
  );
}

function Dot({ on, label, off }: { on?: boolean; label: string; off: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-panel px-2.5 py-1.5 text-[12px] font-medium text-ink">
      <span
        className="size-1.5 rounded-full"
        style={{ background: on ? "var(--green)" : "var(--faint)" }}
      />
      {label}
      {!on && <span className="font-normal text-muted">{off}</span>}
    </span>
  );
}
