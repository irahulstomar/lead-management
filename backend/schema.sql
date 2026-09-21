PRAGMA foreign_keys = ON;

-- Meta lead-ad campaigns. SEEDED, not synced: the real Meta Marketing API needs
-- `ads_read` (App Review) plus a live ad account, which is out of scope. The shape
-- below mirrors what `/act_{id}/campaigns?fields=...,insights` actually returns, so
-- swapping seed rows for a real sync is a data change, not a rebuild.
-- Declared before `leads` because leads.campaign_id references it.
CREATE TABLE campaigns (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT    NOT NULL,
    platform     TEXT    NOT NULL CHECK (platform IN ('facebook', 'instagram')),
    status       TEXT    NOT NULL CHECK (status IN ('active', 'paused')),
    daily_budget REAL    NOT NULL,  -- USD
    spend        REAL    NOT NULL,  -- USD to date
    impressions  INTEGER NOT NULL,
    clicks       INTEGER NOT NULL,
    started_day  INTEGER NOT NULL   -- demo-day
);

CREATE TABLE leads (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT    NOT NULL,
    email          TEXT    NOT NULL,
    phone          TEXT,
    company        TEXT,
    city           TEXT,
    source         TEXT    NOT NULL CHECK (source IN ('website_form', 'lead_ad', 'missed_call', 'email_inquiry')),
    message        TEXT    NOT NULL,

    -- Gemini's structured qualification output. Bounded here as well as in the
    -- response schema, so a bad model response cannot land in the table.
    score          INTEGER CHECK (score BETWEEN 0 AND 100),
    urgency        TEXT    CHECK (urgency IN ('low', 'medium', 'high')),
    intent         TEXT,

    -- 'new'     = arrived, owner alerted, awaiting their decision (2-hour SLA)
    -- 'claimed' = a human took it. Structurally unreachable by the AI sender.
    status         TEXT    NOT NULL CHECK (status IN ('new', 'claimed', 'contacted', 'follow_up_1', 'follow_up_2', 'follow_up_3', 'replied', 'booked', 'cold')),
    next_action_at INTEGER,
    replied_at     INTEGER,
    opted_out      INTEGER NOT NULL DEFAULT 0 CHECK (opted_out IN (0, 1)),

    -- Single-use token backing the "I'll take it" / "Let AI handle it" links in the
    -- owner's alert email. Nulled the moment it is spent.
    claim_token    TEXT,

    -- Set ONLY for source='lead_ad'. Attributing a website-form lead to an ad
    -- campaign would be a lie, and the whole point of this column is attribution.
    campaign_id    INTEGER REFERENCES campaigns(id),

    -- Used only when Gemini is unreachable during a scheduler pass. A recording
    -- must never break on a network blip.
    fallback_1     TEXT    NOT NULL,
    fallback_2     TEXT    NOT NULL,
    fallback_3     TEXT    NOT NULL,

    created_at     INTEGER NOT NULL
);

CREATE TABLE touches (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id       INTEGER NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    -- owner_alert: the "you have a new lead" email to the agency owner
    -- note:        what the human wrote down after working the lead
    -- event:       a state change worth showing in the timeline (claimed, SLA takeover, …)
    kind          TEXT    NOT NULL CHECK (kind IN ('instant_reply', 'follow_up_1', 'follow_up_2', 'follow_up_3', 'inbound_reply', 'hot_alert', 'owner_alert', 'note', 'event')),
    channel       TEXT    NOT NULL CHECK (channel IN ('email', 'sms', 'system')),
    body          TEXT    NOT NULL,
    day           INTEGER NOT NULL,

    -- True for exactly one kind of row: the real Resend email sent by the
    -- landing-page form. Everything else is recorded, not sent.
    was_real_send INTEGER NOT NULL DEFAULT 0 CHECK (was_real_send IN (0, 1)),

    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_touches_lead ON touches(lead_id, day);

CREATE TABLE demo_clock (
    id          INTEGER PRIMARY KEY CHECK (id = 1),
    current_day INTEGER NOT NULL
);

-- Owner-editable engine configuration. A single row (like demo_clock). The engine
-- reads these instead of hardcoded constants; defaults (written by seed.py) reproduce
-- the original behaviour exactly, so the seeded advance-day cascade is unchanged until edited.
--   gap_N   = days of silence before follow-up N goes out (contact->fu1, fu1->fu2, fu2->fu3)
--   intent_N = the guidance Gemini drafts follow-up N inside (the step's purpose, not the
--              safety rules -- those stay in the system prompt and are never owner-editable)
-- sla_hours is display/copy only: the demo clock runs in days, so the AI takeover still
-- fires on the next scheduler pass. The number shown to the owner is what changes.
CREATE TABLE settings (
    id        INTEGER PRIMARY KEY CHECK (id = 1),
    sla_hours INTEGER NOT NULL,
    gap_1     INTEGER NOT NULL,
    gap_2     INTEGER NOT NULL,
    gap_3     INTEGER NOT NULL,
    intent_1  TEXT    NOT NULL,
    intent_2  TEXT    NOT NULL,
    intent_3  TEXT    NOT NULL
);
