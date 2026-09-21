"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { Page, Panel, StatTile } from "@/components/Page";
import { Feed } from "@/components/Feed";
import { getNotifications, type ActivityItem } from "@/lib/api";

export default function NotificationsPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);

  useEffect(() => {
    getNotifications().then((r) => setItems(r.notifications)).catch(() => {});
  }, []);

  const hot = items.filter((i) => i.kind === "hot_alert");

  return (
    <Page
      kicker="Northbeam Partners"
      title="Notifications"
      subtitle="Everything meant to reach a human: a new lead awaiting a decision, and a lead who replied. Each one links straight to the lead."
    >
      <div className="mb-4 grid grid-cols-2 gap-3">
        <StatTile label="Hot-lead alerts 🔥" value={hot.length} sub="Replies that paused a sequence" />
        <StatTile label="New-lead alerts" value={items.length - hot.length} sub="Awaiting an owner decision" />
      </div>

      {hot.length > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-ember/20 bg-ember/[0.03] p-4">
          <Flame size={15} className="mt-0.5 shrink-0 text-ember" />
          <p className="text-[13px] leading-relaxed text-muted">
            <span className="font-semibold text-ember">{hot.length} lead{hot.length > 1 ? "s" : ""} replied.</span>{" "}
            The sequence stopped itself the moment each one answered — the only thing left is for a
            person to pick up the conversation.
          </p>
        </div>
      )}

      <Panel title="All alerts" bodyClass="">
        <Feed items={items} />
      </Panel>
    </Page>
  );
}
