"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { LeadList } from "@/components/LeadList";
import { LeadDetail } from "@/components/LeadDetail";
import {
  addNote,
  advanceDay,
  claimLead,
  getLead,
  getLeads,
  handToAi,
  setOutcome,
  simulateReply,
} from "@/lib/api";
import type { Lead, Touch } from "@/lib/status";

function Leads() {
  const params = useSearchParams();
  // The owner's alert email redirects here after they click a decision link.
  const deepLink = Number(params.get("lead")) || null;

  const [leads, setLeads] = useState<Lead[]>([]);
  const [currentDay, setCurrentDay] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(deepLink);
  const [detail, setDetail] = useState<{ lead: Lead; touches: Touch[] } | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A promise chain, not async/await, so no setState runs synchronously in the caller's
  // body — which is what the effect below (and the react-hooks lint rule) requires.
  const refresh = useCallback(
    () =>
      getLeads()
        .then(({ leads, current_day }) => {
          setLeads(leads);
          setCurrentDay(current_day);
          setSelectedId((id) => id ?? leads[0]?.id ?? null);
          setError(null);
        })
        .catch(() => setError("Can't reach the engine. Start the backend on port 8000.")),
    [],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (selectedId === null) return;
    getLead(selectedId)
      .then(setDetail)
      .catch(() => setDetail(null));
  }, [selectedId, leads]);

  /** Every mutation looks the same: run it, refresh, surface the refusal if any. */
  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      await refresh();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That action was refused.");
    } finally {
      setBusy(false);
    }
  }

  async function onAdvance() {
    setAdvancing(true);
    try {
      await advanceDay();
      await refresh();
    } catch {
      setError("Advance failed. Is the backend running?");
    } finally {
      setAdvancing(false);
    }
  }

  return (
    <div className="flex h-full">
      <Sidebar />
      <LeadList
        leads={leads}
        selectedId={selectedId}
        advancing={advancing}
        onSelect={setSelectedId}
        onAdvance={onAdvance}
      />
      {/* Keyed by lead, so each one opens on the tab its own state calls for. */}
      <LeadDetail
        key={detail?.lead.id ?? "none"}
        lead={detail?.lead ?? null}
        touches={detail?.touches ?? []}
        currentDay={currentDay}
        busy={busy}
        onSimulateReply={(id) => act(() => simulateReply(id))}
        onClaim={(id) => act(() => claimLead(id))}
        onHandToAi={(id) => act(() => handToAi(id))}
        onAddNote={(id, body) => act(() => addNote(id, body))}
        onOutcome={(id, outcome) => act(() => setOutcome(id, outcome))}
      />
      {error && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-lg border border-line-strong bg-panel px-4 py-2.5 text-[12px] text-ember shadow-sm">
          {error}
        </div>
      )}
    </div>
  );
}

export default function Page() {
  // useSearchParams needs a Suspense boundary to prerender.
  return (
    <Suspense>
      <Leads />
    </Suspense>
  );
}
