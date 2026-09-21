// The board reads left-to-right as time. `replied` deliberately breaks that flow —
// it is not a stage the engine walks a lead through, it is an interrupt.

export type Status =
  | "new"
  | "claimed"
  | "contacted"
  | "follow_up_1"
  | "follow_up_2"
  | "follow_up_3"
  | "replied"
  | "booked"
  | "cold";

/** Statuses from which a human may still take the lead. */
export const CLAIMABLE: Status[] = [
  "new",
  "contacted",
  "follow_up_1",
  "follow_up_2",
  "follow_up_3",
];

export type Lead = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  city: string | null;
  source: "website_form" | "lead_ad" | "missed_call" | "email_inquiry";
  message: string;
  score: number | null;
  urgency: "low" | "medium" | "high" | null;
  intent: string | null;
  status: Status;
  next_action_at: number | null;
  replied_at: number | null;
  opted_out: number;
  claim_token: string | null;
  campaign_id: number | null;
  created_at: number;
  // Present only on the single-lead endpoint, and only for lead_ad leads.
  campaign_name?: string | null;
};

export type TouchKind =
  | "instant_reply"
  | "follow_up_1"
  | "follow_up_2"
  | "follow_up_3"
  | "inbound_reply"
  | "hot_alert"
  | "owner_alert"
  | "note"
  | "event";

export type Touch = {
  id: number;
  lead_id: number;
  kind: TouchKind;
  channel: "email" | "sms" | "system";
  body: string;
  day: number;
  was_real_send: number;
};

export const COLUMNS: { status: Status; label: string; tint: string; breaksFlow?: boolean }[] = [
  { status: "contacted", label: "Contacted", tint: "var(--contacted)" },
  { status: "follow_up_1", label: "Follow-up 1", tint: "var(--silence-1)" },
  { status: "follow_up_2", label: "Follow-up 2", tint: "var(--silence-2)" },
  { status: "follow_up_3", label: "Follow-up 3", tint: "var(--silence-3)" },
  { status: "replied", label: "Replied", tint: "var(--ember)", breaksFlow: true },
  { status: "booked", label: "Booked", tint: "var(--buoy)" },
  { status: "cold", label: "Cold", tint: "var(--cold)" },
];

export const SOURCE_LABEL: Record<Lead["source"], string> = {
  website_form: "Website form",
  lead_ad: "Lead ad",
  missed_call: "Missed call",
  email_inquiry: "Email",
};

/** Compact labels for the activity + notification feeds. The lead timeline uses its
 *  own richer phrasing; this is the one-line version for a cross-lead feed. */
export const TOUCH_LABEL: Record<TouchKind, string> = {
  instant_reply: "Instant reply sent",
  follow_up_1: "Follow-up 1 sent",
  follow_up_2: "Follow-up 2 sent",
  follow_up_3: "Breakup sent",
  inbound_reply: "Lead replied",
  hot_alert: "Hot-lead alert",
  owner_alert: "Owner alerted",
  note: "Call note",
  event: "Status change",
};

/** The colour a feed row carries. Only the moments that mean something get colour. */
export function touchTone(kind: TouchKind): ChipTone {
  if (kind === "hot_alert" || kind === "inbound_reply") return "ember";
  if (kind === "owner_alert") return "blue";
  if (kind === "note") return "amber";
  return "neutral";
}

export type ChipTone = "amber" | "blue" | "ember" | "green" | "muted" | "neutral";

/** Background + text classes for each chip tone. Shared by the list and every page,
 *  so a tone means the same thing everywhere and can't drift per-component. */
export const TONE_CLASS: Record<ChipTone, string> = {
  amber: "bg-amber-soft text-amber",
  blue: "bg-blue/10 text-blue",
  ember: "bg-ember/10 text-ember",
  green: "bg-green/10 text-green",
  muted: "bg-active text-muted",
  neutral: "bg-active text-muted",
};

/**
 * The one-glance status of a lead, for the list.
 *
 * opted_out is checked FIRST and deliberately. An opted-out lead keeps whatever
 * status it had when it opted out (Derek is still 'contacted' in the database),
 * so reading `status` alone would print "Contacted" next to a man who asked us to
 * leave him alone.
 */
export function statusChip(lead: Lead): { label: string; tone: ChipTone } {
  if (lead.opted_out === 1) return { label: "Opted out", tone: "muted" };

  switch (lead.status) {
    case "new":
      return { label: "Awaiting decision", tone: "amber" };
    case "claimed":
      return { label: "Worked by Jordan", tone: "blue" };
    case "replied":
      return { label: "Replied", tone: "ember" };
    case "booked":
      return { label: "Booked", tone: "green" };
    case "cold":
      return { label: "Cold", tone: "muted" };
    case "contacted":
      return { label: "Contacted", tone: "neutral" };
    default:
      return { label: `Follow-up ${cadence(lead.status)}`, tone: "neutral" };
  }
}

/** Which follow-ups have fired. Drives the cadence rail on every card. */
export function cadence(status: Status): number {
  if (status === "follow_up_1") return 1;
  if (status === "follow_up_2") return 2;
  if (status === "follow_up_3" || status === "cold") return 3;
  return 0;
}

/** A score is a judgement, not a measurement. Three bands, not a gradient. */
export function scoreTone(score: number | null): string {
  if (score === null) return "var(--ash)";
  if (score >= 80) return "var(--buoy)";
  if (score >= 60) return "var(--silence-3)";
  return "var(--dusk)";
}

export function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/** Deterministic monogram hue, so a lead keeps its colour across renders. */
export function monogramHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

/** A lead is "silent" from the day it was last touched. */
export function daysSilent(lead: Lead, currentDay: number): number | null {
  if (lead.replied_at !== null || lead.status === "booked") return null;
  return Math.max(0, currentDay - lead.created_at);
}
