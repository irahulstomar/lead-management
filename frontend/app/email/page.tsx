"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Page, Panel } from "@/components/Page";
import { getTemplates, type Templates } from "@/lib/api";

const ARC = ["Value-add", "Gentle nudge", "Polite breakup"];

export default function EmailPage() {
  const [t, setT] = useState<Templates | null>(null);

  useEffect(() => {
    getTemplates().then(setT).catch(() => {});
  }, []);

  return (
    <Page
      kicker="Northbeam Partners"
      title="Email templates"
      subtitle="The approved follow-up templates, exactly as the engine sends them. This is a reference, not an inbox — the AI drafts the middle of each message and never anything else."
    >
      <div className="space-y-4">
        {(t?.steps ?? []).map((s) => (
          <Panel
            key={s.step}
            title={`Follow-up ${s.step} — ${ARC[s.step - 1]}`}
            right={<span className="text-[12px] text-muted">{s.intent}</span>}
            bodyClass="p-5"
          >
            <div className="rounded-lg border border-line bg-panel px-4 py-3.5">
              <p className="text-[13px] leading-relaxed whitespace-pre-line text-ink">{s.example}</p>
            </div>
          </Panel>
        ))}

        <div className="flex items-start gap-3 rounded-xl border border-blue/20 bg-blue/[0.03] p-5">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-blue" />
          <div>
            <h3 className="text-[13px] font-semibold text-ink">How the drafting is grounded</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
              Gemini writes only the body paragraph. The greeting and the sign-off from{" "}
              {t?.rep ?? "the rep"} at {t?.agency ?? "the agency"} are fixed. Every claim in the
              body must come from the lead&rsquo;s own message — no invented statistics, prices, or
              promises. The examples above are the offline fallback copy, shown here because the
              live drafts follow the same shape.
            </p>
          </div>
        </div>
      </div>
    </Page>
  );
}
