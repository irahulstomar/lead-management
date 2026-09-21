"use client";

import { useState } from "react";
import {
  Bookmark,
  MoreHorizontal,
  Phone,
  Mail,
  MessageSquare,
  Pencil,
  Flame,
  Ban,
  Hand,
  Bot,
  BellRing,
  StickyNote,
  CircleDot,
  Clock,
} from "lucide-react";
import { Avatar } from "./LeadList";
import { CLAIMABLE, SOURCE_LABEL, type Lead, type Touch } from "@/lib/status";

const TABS = ["Contact info", "Qualification", "Sequence", "Activity"] as const;
type Tab = (typeof TABS)[number];

const STATUS_LABEL: Record<Lead["status"], string> = {
  new: "Awaiting decision",
  claimed: "Worked by Jordan Ellis",
  contacted: "Contacted",
  follow_up_1: "Follow-up 1 sent",
  follow_up_2: "Follow-up 2 sent",
  follow_up_3: "Follow-up 3 sent",
  replied: "Replied",
  booked: "Booked",
  cold: "Cold",
};

const KIND_LABEL: Record<Touch["kind"], string> = {
  instant_reply: "Instant reply",
  follow_up_1: "Follow-up 1 — value-add",
  follow_up_2: "Follow-up 2 — nudge",
  follow_up_3: "Follow-up 3 — breakup",
  inbound_reply: "They replied",
  hot_alert: "Hot lead alert",
  owner_alert: "Owner alerted",
  note: "Call note",
  event: "",
};

export function LeadDetail({
  lead,
  touches,
  currentDay,
  busy,
  onSimulateReply,
  onClaim,
  onHandToAi,
  onAddNote,
  onOutcome,
}: {
  lead: Lead | null;
  touches: Touch[];
  currentDay: number;
  busy: boolean;
  onSimulateReply: (id: number) => void;
  onClaim: (id: number) => void;
  onHandToAi: (id: number) => void;
  onAddNote: (id: number, body: string) => Promise<void>;
  onOutcome: (id: number, outcome: "booked" | "lost") => void;
}) {
  // A lead awaiting a decision should open on the decision, not on their phone number.
  // The parent keys this component by lead id, so switching leads remounts it and this
  // initial choice is made afresh for each one — no effect, no cascading render.
  const [tab, setTab] = useState<Tab>(
    lead?.status === "new" || lead?.status === "claimed" ? "Sequence" : "Contact info",
  );

  if (!lead) {
    return (
      <section className="grid flex-1 place-items-center bg-panel">
        <p className="text-[13px] text-muted">Select a lead to see their file.</p>
      </section>
    );
  }

  const isNew = lead.status === "new";
  const isClaimed = lead.status === "claimed";
  const canClaim = lead.opted_out === 0 && CLAIMABLE.includes(lead.status);
  const canReply =
    lead.replied_at === null && lead.opted_out === 0 && CLAIMABLE.includes(lead.status);
  const followUpsSent = touches.filter((t) => t.kind.startsWith("follow_up")).length;
  const notes = touches.filter((t) => t.kind === "note");

  return (
    <section className="flex flex-1 flex-col overflow-hidden bg-panel">
      <div className="flex items-center justify-between px-6 pt-5">
        <Bookmark size={17} className="text-faint" />
        <button className="grid size-7 place-items-center rounded-md border border-line-strong text-muted hover:bg-hover">
          <MoreHorizontal size={15} />
        </button>
      </div>

      <div className="flex items-center gap-5 px-6 pt-1 pb-6">
        <Avatar name={lead.name} size={96} />
        <div>
          <h2 className="text-[17px] font-semibold text-ink">{lead.name}</h2>
          <p className="mt-0.5 text-[13px] text-muted">{lead.company}</p>
          <div className="mt-3 flex items-center gap-2">
            <Circle icon={Phone} />
            <Circle icon={Mail} />
            <Circle icon={MessageSquare} />
            {lead.replied_at !== null && (
              <Chip tone="ember" icon={Flame}>
                Replied day {lead.replied_at}
              </Chip>
            )}
            {lead.opted_out === 1 && (
              <Chip tone="muted" icon={Ban}>
                Opted out
              </Chip>
            )}
            {isNew && (
              <Chip tone="amber" icon={Clock}>
                Awaiting decision
              </Chip>
            )}
            {isClaimed && (
              <Chip tone="blue" icon={Hand}>
                Worked by Jordan
              </Chip>
            )}
          </div>
        </div>
      </div>

      {isNew && (
        <div className="mx-6 mb-5 rounded-xl border border-amber/25 bg-amber-soft p-4">
          <p className="text-[13px] font-semibold text-ink">This lead is waiting on you.</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted">
            They got an instant reply already. Take the conversation yourself, or hand it to
            the AI. If nobody responds within the 2-hour SLA, the AI picks it up on the next
            pass.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              disabled={busy}
              onClick={() => onClaim(lead.id)}
              className="flex items-center gap-1.5 rounded-lg bg-blue px-3 py-2 text-[12px] font-medium text-white hover:bg-blue-hover disabled:opacity-60"
            >
              <Hand size={13} /> I&rsquo;ll take it
            </button>
            <button
              disabled={busy}
              onClick={() => onHandToAi(lead.id)}
              className="flex items-center gap-1.5 rounded-lg border border-line-strong bg-panel px-3 py-2 text-[12px] font-medium text-ink hover:bg-hover disabled:opacity-60"
            >
              <Bot size={13} /> Let AI handle it
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-6 border-b border-line px-6">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 pb-3 text-[13px] transition-colors ${
              tab === t
                ? "border-ink font-medium text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="scroll-quiet flex-1 overflow-y-auto bg-canvas p-6">
        {tab === "Contact info" && (
          <div className="space-y-4">
            <Card title="Basic">
              <Field label="Name" value={lead.name} />
              <Field label="Source" value={SOURCE_LABEL[lead.source]} />
              <Field label="Company" value={lead.company ?? "—"} />
              <Field label="Location" value={lead.city ?? "—"} />
              <Field label="Status" value={STATUS_LABEL[lead.status]} />
              {/* Attribution only exists for lead_ad leads; never fabricated for others. */}
              {lead.source === "lead_ad" && lead.campaign_name && (
                <Field label="Campaign" value={lead.campaign_name} />
              )}
            </Card>
            <Card title="Communication">
              <Field label="Phone" value={lead.phone ?? "—"} />
              <Field label="Email" value={lead.email} />
            </Card>
          </div>
        )}

        {tab === "Qualification" && (
          <div className="space-y-4">
            <Card title="Gemini's read">
              <Field label="Score" value={`${lead.score ?? "—"} / 100`} />
              <Field label="Urgency" value={lead.urgency ?? "—"} capitalize />
            </Card>
            <Card title="Intent">
              <p className="col-span-2 text-[13px] leading-relaxed text-ink">{lead.intent}</p>
            </Card>
            <Card title="What they actually wrote">
              <p className="col-span-2 text-[13px] leading-relaxed whitespace-pre-line text-muted">
                {lead.message}
              </p>
            </Card>
          </div>
        )}

        {tab === "Sequence" && (
          <div className="space-y-4">
            <Card title="Cadence">
              <Field label="Current stage" value={STATUS_LABEL[lead.status]} />
              <Field
                label={isNew ? "If nobody responds" : "Next follow-up"}
                value={
                  // A claimed or opted-out lead can carry a stale next_action_at — the query
                  // blocks them, not the column. Never show it as a pending action.
                  isClaimed
                    ? "Paused — a human owns this lead"
                    : !canReply || lead.next_action_at === null
                      ? "None — sequence stopped"
                      : isNew
                        ? `AI takes over on day ${lead.next_action_at}`
                        : `Day ${lead.next_action_at} (in ${lead.next_action_at - currentDay}d)`
                }
              />
              <Field label="First seen" value={`Day ${lead.created_at}`} />
              <Field label="Follow-ups sent" value={`${followUpsSent} of 3`} />
            </Card>

            {isClaimed && (
              <NoteComposer leadId={lead.id} notes={notes} busy={busy} onAddNote={onAddNote} />
            )}

            {isClaimed && (
              <Card title="Close it out">
                <div className="col-span-2 flex flex-wrap gap-2">
                  <button
                    disabled={busy}
                    onClick={() => onOutcome(lead.id, "booked")}
                    className="rounded-lg border border-green/30 bg-green/5 px-3 py-2 text-[12px] font-medium text-green hover:bg-green/10 disabled:opacity-60"
                  >
                    Mark booked
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => onOutcome(lead.id, "lost")}
                    className="rounded-lg border border-line-strong px-3 py-2 text-[12px] font-medium text-ink hover:bg-hover disabled:opacity-60"
                  >
                    Mark lost
                  </button>
                  <button
                    disabled={busy || followUpsSent >= 3}
                    title={followUpsSent >= 3 ? "All three follow-ups have already been sent" : ""}
                    onClick={() => onHandToAi(lead.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-line-strong px-3 py-2 text-[12px] font-medium text-ink hover:bg-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Bot size={13} /> Hand back to AI
                  </button>
                </div>
              </Card>
            )}

            {!isNew && !isClaimed && canClaim && (
              <div className="flex gap-2">
                <button
                  disabled={busy}
                  onClick={() => onClaim(lead.id)}
                  className="flex items-center gap-1.5 rounded-xl border border-line-strong bg-panel px-3.5 py-2.5 text-[13px] font-medium text-ink hover:bg-hover disabled:opacity-60"
                >
                  <Hand size={14} /> Take over this lead
                </button>
                <button
                  disabled={busy}
                  onClick={() => onSimulateReply(lead.id)}
                  className="rounded-xl border border-line-strong bg-panel px-3.5 py-2.5 text-[13px] font-medium text-ink hover:bg-hover disabled:opacity-60"
                >
                  Simulate an inbound reply
                </button>
              </div>
            )}

            {!canClaim && !isClaimed && <StoppedReason lead={lead} followUpsSent={followUpsSent} />}
          </div>
        )}

        {tab === "Activity" && (
          <ol className="space-y-3">
            {touches.map((t) =>
              t.kind === "event" ? (
                <li key={t.id} className="flex items-center gap-2 py-0.5 pl-1">
                  <CircleDot size={12} className="shrink-0 text-faint" />
                  <span className="text-[12px] text-muted">{t.body}</span>
                  <span className="ml-auto shrink-0 text-[11px] text-faint">Day {t.day}</span>
                </li>
              ) : (
                <li key={t.id} className={`rounded-xl border p-4 ${cardTone(t.kind)}`}>
                  <div className="mb-2 flex items-center gap-2">
                    {t.kind === "note" && <StickyNote size={13} className="text-amber" />}
                    {t.kind === "owner_alert" && <BellRing size={13} className="text-blue" />}
                    <span
                      className={`text-[12px] font-medium ${
                        t.kind === "hot_alert" || t.kind === "inbound_reply"
                          ? "text-ember"
                          : t.kind === "note"
                            ? "text-amber"
                            : "text-ink"
                      }`}
                    >
                      {KIND_LABEL[t.kind]}
                    </span>
                    <span className="text-[11px] text-muted">Day {t.day}</span>
                    {t.was_real_send === 1 && (
                      <span className="rounded-full bg-green/10 px-2 py-0.5 text-[10px] font-medium text-green">
                        Sent via Resend
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] leading-relaxed whitespace-pre-line text-muted">
                    {t.body}
                  </p>
                </li>
              ),
            )}
          </ol>
        )}
      </div>
    </section>
  );
}

/** Why the engine stopped. Four different reasons — say which one, and what it means. */
function StoppedReason({ lead, followUpsSent }: { lead: Lead; followUpsSent: number }) {
  const first = lead.name.split(" ")[0];

  if (lead.opted_out === 1)
    return (
      <Stopped tone="muted" title="They asked not to be contacted">
        {first} opted out, so the engine can never message them again. That rule lives in the
        database query that picks who is due — they are not skipped, they are never selected.
      </Stopped>
    );

  if (lead.status === "replied")
    return (
      <Stopped tone="ember" title={`${first} replied — it's your turn`}>
        The sequence stopped itself the moment they answered on day {lead.replied_at}. Nothing
        further is automated, on purpose: the next message should come from a person, and the
        odds decay by the hour.
      </Stopped>
    );

  if (lead.status === "booked")
    return (
      <Stopped tone="green" title="Booked">
        {first} is on the calendar. Nobody chases a lead who already said yes.
      </Stopped>
    );

  return (
    <Stopped tone="muted" title="Gone cold">
      All {followUpsSent} follow-ups were sent and {first} never replied. The breakup message
      has gone out and the sequence has ended. Nothing further will be sent.
    </Stopped>
  );
}

function Stopped({
  tone,
  title,
  children,
}: {
  tone: "ember" | "green" | "muted";
  title: string;
  children: React.ReactNode;
}) {
  const box = {
    ember: "border-ember/20 bg-ember/[0.03]",
    green: "border-green/20 bg-green/[0.03]",
    muted: "border-line bg-well",
  }[tone];
  const heading = { ember: "text-ember", green: "text-green", muted: "text-ink" }[tone];

  return (
    <div className={`rounded-xl border px-4 py-3.5 ${box}`}>
      <p className={`text-[12px] font-semibold ${heading}`}>{title}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-muted">{children}</p>
    </div>
  );
}

function cardTone(kind: Touch["kind"]): string {
  if (kind === "note") return "border-amber/25 bg-amber-soft";
  if (kind === "owner_alert") return "border-blue/20 bg-blue/[0.03]";
  return "border-line bg-well";
}

function NoteComposer({
  leadId,
  notes,
  busy,
  onAddNote,
}: {
  leadId: number;
  notes: Touch[];
  busy: boolean;
  onAddNote: (id: number, body: string) => Promise<void>;
}) {
  const [text, setText] = useState("");

  async function save() {
    if (!text.trim()) return;
    await onAddNote(leadId, text.trim());
    setText("");
  }

  return (
    <div className="rounded-xl border border-line bg-well">
      <div className="flex items-center justify-between px-5 py-3.5">
        <h3 className="text-[13px] font-semibold text-ink">Call notes</h3>
        {notes.length === 0 && (
          <span className="rounded-full bg-amber-soft px-2 py-0.5 text-[10px] font-medium text-amber">
            Log what you talked about
          </span>
        )}
      </div>

      {notes.length > 0 && (
        <ul className="border-t border-line">
          {notes.map((n) => (
            <li key={n.id} className="border-b border-line px-5 py-3 last:border-b-0">
              <p className="text-[11px] text-muted">Day {n.day}</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-ink">{n.body}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-line p-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="What did you discuss? What did they actually need?"
          className="w-full resize-none rounded-lg border border-line-strong bg-panel p-3 text-[12px] leading-relaxed text-ink outline-none placeholder:text-faint focus:border-blue/40"
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={save}
            disabled={busy || !text.trim()}
            className="rounded-lg bg-blue px-3 py-1.5 text-[12px] font-medium text-white hover:bg-blue-hover disabled:opacity-40"
          >
            Save note
          </button>
        </div>
      </div>
    </div>
  );
}

function Chip({
  tone,
  icon: Icon,
  children,
}: {
  tone: "ember" | "amber" | "blue" | "muted";
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  const tones = {
    ember: "bg-ember/10 text-ember",
    amber: "bg-amber-soft text-amber",
    blue: "bg-blue/10 text-blue",
    muted: "bg-active text-muted",
  };
  return (
    <span
      className={`ml-1 flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium ${tones[tone]}`}
    >
      <Icon size={11} /> {children}
    </span>
  );
}

function Circle({ icon: Icon }: { icon: React.ElementType }) {
  return (
    <span className="grid size-8 cursor-default place-items-center rounded-full border border-line-strong text-muted">
      <Icon size={14} />
    </span>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-well">
      <div className="flex items-center justify-between px-5 py-3.5">
        <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
        <Pencil size={14} className="text-faint" />
      </div>
      <div className="border-t border-line px-5 py-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  // Never blanket-capitalize: it turns an email into M.Whitfield@Ridgelinelogistics.Com.
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-muted">{label}</p>
      <p
        className={`mt-0.5 truncate text-[13px] font-medium text-ink ${capitalize ? "capitalize" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
