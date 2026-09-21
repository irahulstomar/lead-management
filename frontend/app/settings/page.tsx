"use client";

import { useEffect, useState } from "react";
import { Clock, Sparkles, Send, Check } from "lucide-react";
import { Page, Panel, Chip } from "@/components/Page";
import {
  getSettings,
  saveSettings,
  getStatus,
  type EngineSettings,
  type IntegrationStatus,
} from "@/lib/api";

// Each follow-up step: its fixed arc name, and which config fields it edits.
const STEPS = [
  { n: 1, name: "Value-add", gap: "gap_1", intent: "intent_1" },
  { n: 2, name: "Gentle nudge", gap: "gap_2", intent: "intent_2" },
  { n: 3, name: "Polite breakup", gap: "gap_3", intent: "intent_3" },
] as const;

export default function SettingsPage() {
  const [cfg, setCfg] = useState<EngineSettings | null>(null);
  const [saved, setSaved] = useState<EngineSettings | null>(null); // last-persisted baseline
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSettings()
      .then((s) => {
        setCfg(s);
        setSaved(s);
      })
      .catch(() => setError("Couldn't load settings. Is the backend running?"));
    getStatus().then(setStatus).catch(() => {});
  }, []);

  const dirty = cfg !== null && saved !== null && JSON.stringify(cfg) !== JSON.stringify(saved);

  function set<K extends keyof EngineSettings>(key: K, value: EngineSettings[K]) {
    setCfg((c) => (c ? { ...c, [key]: value } : c));
    setJustSaved(false);
  }

  async function save() {
    if (!cfg) return;
    setBusy(true);
    setError(null);
    try {
      const next = await saveSettings(cfg);
      setCfg(next);
      setSaved(next);
      setJustSaved(true);
    } catch {
      setError("That was refused — check the values are within range.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page
      kicker="Northbeam Partners"
      title="Settings"
      subtitle="How the engine runs. Changes take effect on the next scheduler pass — they never touch a lead already in flight, only the timing and drafting of what comes next."
      actions={
        <button
          onClick={save}
          disabled={!dirty || busy}
          className="flex items-center gap-1.5 rounded-lg bg-blue px-3.5 py-2 text-[13px] font-medium text-white transition-colors hover:bg-blue-hover disabled:opacity-40"
        >
          {justSaved && !dirty ? <Check size={14} /> : null}
          {busy ? "Saving…" : justSaved && !dirty ? "Saved" : "Save changes"}
        </button>
      }
    >
      {error && (
        <div className="mb-4 rounded-lg border border-ember/25 bg-ember/[0.03] px-4 py-2.5 text-[12px] text-ember">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <Panel title="Response SLA" bodyClass="p-5">
          <div className="flex items-start gap-3.5">
            <Clock size={17} className="mt-0.5 shrink-0 text-blue" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <NumberField
                  value={cfg?.sla_hours}
                  onChange={(v) => set("sla_hours", v)}
                  suffix="hours"
                  disabled={!cfg}
                />
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-muted">
                How long a fresh lead waits for a human before the AI takes over. In this demo the
                clock runs in days, so this sets the number the owner sees — the takeover itself
                fires on the next scheduler pass.
              </p>
            </div>
          </div>
        </Panel>

        <Panel title="Follow-up cadence" bodyClass="p-5">
          <div className="space-y-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-lg border border-line bg-panel p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[13px] font-semibold text-ink">
                    Follow-up {s.n} <span className="font-normal text-muted">· {s.name}</span>
                  </p>
                  <div className="flex items-center gap-1.5 text-[12px] text-muted">
                    after
                    <NumberField
                      value={cfg?.[s.gap]}
                      onChange={(v) => set(s.gap, v)}
                      suffix="days"
                      compact
                      disabled={!cfg}
                    />
                    of silence
                  </div>
                </div>
                <label className="mt-3 block">
                  <span className="text-[11px] text-muted">What this message should do</span>
                  <textarea
                    value={cfg?.[s.intent] ?? ""}
                    onChange={(e) => set(s.intent, e.target.value)}
                    disabled={!cfg}
                    rows={2}
                    maxLength={200}
                    className="mt-1 w-full resize-none rounded-lg border border-line-strong bg-panel p-2.5 text-[12px] leading-relaxed text-ink outline-none placeholder:text-faint focus:border-blue/40 disabled:opacity-60"
                  />
                </label>
              </div>
            ))}
          </div>
          <p className="mt-3.5 border-t border-line pt-3 text-[12px] leading-relaxed text-muted">
            Gemini drafts each message inside the guidance above — never the greeting, never the
            sign-off, and never a claim that isn&rsquo;t in the lead&rsquo;s own words. Those rules are
            fixed. The number of follow-ups is fixed at three.
          </p>
        </Panel>

        <Panel title="Integrations" bodyClass="">
          <ul className="divide-y divide-line">
            <Integration
              icon={Sparkles}
              name="Gemini 2.5 Flash"
              desc="Qualifies each lead and drafts follow-ups"
              on={status?.gemini_configured}
            />
            <Integration
              icon={Send}
              name="Resend"
              desc="Sends the one real email — the landing-form path to the test inbox"
              on={status?.resend_configured}
              offLabel="Test path off"
            />
          </ul>
        </Panel>
      </div>
    </Page>
  );
}

function NumberField({
  value,
  onChange,
  suffix,
  compact,
  disabled,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  suffix: string;
  compact?: boolean;
  disabled?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <input
        type="number"
        min={1}
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))}
        className={`tnum ${compact ? "w-12" : "w-16"} rounded-lg border border-line-strong bg-panel px-2 py-1.5 text-center text-[13px] font-medium text-ink outline-none focus:border-blue/40 disabled:opacity-60`}
      />
      <span className={`${compact ? "text-[12px] text-muted" : "text-[13px] font-medium text-ink"}`}>
        {suffix}
      </span>
    </span>
  );
}

function Integration({
  icon: Icon,
  name,
  desc,
  on,
  offLabel = "Not configured",
}: {
  icon: React.ElementType;
  name: string;
  desc: string;
  on?: boolean;
  offLabel?: string;
}) {
  return (
    <li className="flex items-center gap-3.5 px-5 py-3.5">
      <Icon size={16} className="shrink-0 text-faint" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-ink">{name}</p>
        <p className="text-[12px] text-muted">{desc}</p>
      </div>
      {on ? <Chip tone="green">Configured</Chip> : <Chip tone="muted">{offLabel}</Chip>}
    </li>
  );
}
