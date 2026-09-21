import type { Lead, Touch, TouchKind } from "./status";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${path} → ${res.status}`);
  return res.json();
}

export type Stats = {
  current_day: number;
  total_leads: number;
  hot_leads: number;
  booked: number;
  awaiting_decision: number;
  claimed: number;
  follow_ups_sent: number;
};

export type AdvanceResult = {
  day: number;
  sent: { lead_id: number; name: string; step: number }[];
  cooled: { lead_id: number; name: string }[];
};

export const getLeads = () => req<{ current_day: number; leads: Lead[] }>("/api/leads");
export const getLead = (id: number) => req<{ lead: Lead; touches: Touch[] }>(`/api/leads/${id}`);
export const getStats = () => req<Stats>("/api/stats");
export const advanceDay = () => req<AdvanceResult>("/api/advance-day", { method: "POST" });
export const simulateReply = (id: number) =>
  req<{ lead_id: number; name: string; day: number }>(`/api/leads/${id}/simulate-reply`, {
    method: "POST",
    body: JSON.stringify({}),
  });

const post = <T>(path: string, body?: unknown) =>
  req<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) });

export const claimLead = (id: number) => post<{ status: string }>(`/api/leads/${id}/claim`);
export const handToAi = (id: number) => post<{ status: string }>(`/api/leads/${id}/hand-to-ai`);
export const addNote = (id: number, body: string) => post(`/api/leads/${id}/notes`, { body });
export const setOutcome = (id: number, outcome: "booked" | "lost") =>
  post<{ status: string }>(`/api/leads/${id}/outcome`, { outcome });

// --- Read-only views. None of these mutate a lead. -------------------------------

export type ActivityItem = {
  id: number;
  lead_id: number;
  kind: TouchKind;
  body: string;
  day: number;
  was_real_send: number;
  lead_name: string;
  lead_company: string | null;
};

export type Campaign = {
  id: number;
  name: string;
  platform: "facebook" | "instagram";
  status: "active" | "paused";
  daily_budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  started_day: number;
  lead_count: number;
  replied: number;
  booked: number;
  ctr: number | null;
  cpl: number | null;
  cost_per_booked: number | null;
};

export type CampaignTotals = {
  spend: number;
  leads: number;
  booked: number;
  cpl: number | null;
  cost_per_booked: number | null;
};

export type Analytics = {
  funnel: { stage: string; count: number }[];
  by_source: { source: Lead["source"]; leads: number; replied: number; booked: number }[];
  total_leads: number;
};

export type Templates = {
  agency: string;
  rep: string;
  signature: string;
  steps: { step: number; intent: string; example: string }[];
};

export type IntegrationStatus = {
  gemini_configured: boolean;
  resend_configured: boolean;
};

export type EngineSettings = {
  sla_hours: number;
  gap_1: number;
  gap_2: number;
  gap_3: number;
  intent_1: string;
  intent_2: string;
  intent_3: string;
};

export const getActivity = (limit = 12) =>
  req<{ activity: ActivityItem[] }>(`/api/activity?limit=${limit}`);
export const getNotifications = () =>
  req<{ notifications: ActivityItem[] }>("/api/notifications");
export const getCampaigns = () =>
  req<{ campaigns: Campaign[]; totals: CampaignTotals }>("/api/campaigns");
export const getAnalytics = () => req<Analytics>("/api/analytics");
export const getTemplates = () => req<Templates>("/api/templates");
export const getStatus = () => req<IntegrationStatus>("/api/status");
export const getSettings = () => req<EngineSettings>("/api/settings");
export const saveSettings = (s: EngineSettings) =>
  req<EngineSettings>("/api/settings", { method: "POST", body: JSON.stringify(s) });
