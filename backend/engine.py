"""The sequence engine.

`run_scheduler_pass()` is the whole product. In this demo it is triggered by the
dashboard's advance button; in production the identical function would run on a
cron. Nothing else about it would change.

Sending is driven by DUE_LEADS_SQL and nothing else. A lead who has replied or
opted out is not skipped by an `if` -- they are never returned by the query in
the first place.
"""

import logging

import gemini
from db import DUE_LEADS_SQL, STALE_BREAKUP_SQL, get_conn, get_settings

log = logging.getLogger(__name__)

# Which follow-up a lead receives next, given where they are now.
# 'new' means the owner never answered the alert -- the AI picks the lead up at step 1.
NEXT_STEP = {"new": 1, "contacted": 1, "follow_up_1": 2, "follow_up_2": 3}
STEP_STATUS = {1: "follow_up_1", 2: "follow_up_2", 3: "follow_up_3"}

# Days the breakup message sits before the lead ages out to cold. Not owner-editable:
# Settings exposes the three follow-up gaps, not the terminal sweep.
BREAKUP_DAYS = 7


def _delays(cfg: dict) -> dict:
    """Days until the next action after sending step N, from owner config.
    gap_2 spaces fu1->fu2, gap_3 spaces fu2->fu3; the breakup ages out on a fixed clock."""
    return {1: cfg["gap_2"], 2: cfg["gap_3"], 3: BREAKUP_DAYS}


def _sla_takeover(cfg: dict) -> str:
    return (
        f"No response from the team within the {cfg['sla_hours']}-hour SLA. "
        "AI follow-up engaged automatically."
    )

# A human may take a lead from any of these. Not from replied, opted-out, booked or cold.
CLAIMABLE = {"new", "contacted", "follow_up_1", "follow_up_2", "follow_up_3"}

# Drafting takes seconds, and in production this pass runs on a cron while the owner is
# awake: a lead can reply, opt out, or be claimed between DUE_LEADS_SQL selecting them
# and the follow-up being written. So the write is a compare-and-swap -- it re-asserts
# every condition the selection made, against the row as it stands now. If the lead moved,
# it matches nothing, and no touch is inserted.
#
# This is NOT a second selection path: it can only ever act on a lead DUE_LEADS_SQL
# already chose, and it can only narrow that set, never widen it.
ADVANCE_STEP_SQL = """
UPDATE leads SET status = :new_status, next_action_at = :next_action_at
WHERE id = :id
  AND status = :from_status
  AND replied_at IS NULL
  AND opted_out = 0
  AND next_action_at <= :current_day
"""

# Same guard for the terminal sweep: a lead who replied while the pass was drafting must
# not be quietly filed as cold.
GO_COLD_SQL = """
UPDATE leads SET status = 'cold', next_action_at = NULL
WHERE id = :id
  AND status = 'follow_up_3'
  AND replied_at IS NULL
  AND opted_out = 0
"""


def get_current_day() -> int:
    conn = get_conn()
    try:
        return conn.execute("SELECT current_day FROM demo_clock WHERE id = 1").fetchone()[0]
    finally:
        conn.close()


def _event(conn, lead_id: int, body: str, day: int) -> None:
    conn.execute(
        """INSERT INTO touches (lead_id, kind, channel, body, day, was_real_send)
           VALUES (?, 'event', 'system', ?, ?, 0)""",
        (lead_id, body, day),
    )


def _load(conn, lead_id: int):
    lead = conn.execute("SELECT * FROM leads WHERE id = ?", (lead_id,)).fetchone()
    if lead is None:
        raise LookupError(f"no lead {lead_id}")
    return lead


def run_scheduler_pass() -> dict:
    """Message every lead who is due and still silent. Age out dead breakups."""
    day = get_current_day()
    cfg = get_settings()
    delays = _delays(cfg)
    sla_takeover = _sla_takeover(cfg)
    conn = get_conn()
    try:
        due = conn.execute(DUE_LEADS_SQL, {"current_day": day}).fetchall()

        # One Gemini call for the whole pass. Falls back per-lead on any failure.
        steps = [(lead, NEXT_STEP[lead["status"]]) for lead in due]
        drafts = gemini.draft_batch(steps)

        sent = []
        for lead, step in steps:
            # Claim the step before recording it. A lead who replied, opted out, or was
            # claimed while Gemini was drafting no longer matches, and gets nothing.
            claimed = conn.execute(
                ADVANCE_STEP_SQL,
                {
                    "id": lead["id"],
                    "from_status": lead["status"],
                    "new_status": STEP_STATUS[step],
                    "next_action_at": day + delays[step],
                    "current_day": day,
                },
            ).rowcount
            if claimed == 0:
                log.info(
                    "lead %s moved out of reach while drafting; nothing sent", lead["id"]
                )
                continue

            # The owner was alerted and never answered. Say so, in the timeline, before
            # the machine takes the lead over. Silence is a decision worth recording.
            if lead["status"] == "new":
                _event(conn, lead["id"], sla_takeover, day)
                conn.execute("UPDATE leads SET claim_token = NULL WHERE id = ?", (lead["id"],))

            conn.execute(
                """INSERT INTO touches (lead_id, kind, channel, body, day, was_real_send)
                   VALUES (?, ?, 'email', ?, ?, 0)""",
                (lead["id"], f"follow_up_{step}", drafts[lead["id"]], day),
            )
            sent.append({"lead_id": lead["id"], "name": lead["name"], "step": step})

        # Breakup sent, silence since. Status only -- this never messages anyone.
        cooled = []
        for lead in conn.execute(STALE_BREAKUP_SQL, {"current_day": day}).fetchall():
            if conn.execute(GO_COLD_SQL, {"id": lead["id"]}).rowcount:
                cooled.append({"lead_id": lead["id"], "name": lead["name"]})
        conn.commit()
    finally:
        conn.close()

    return {"day": day, "sent": sent, "cooled": cooled}


def advance_day() -> dict:
    """Move the demo clock forward one day, then run the pass.

    Kept separate from run_scheduler_pass so the pass is cron-able unchanged.
    """
    conn = get_conn()
    try:
        conn.execute("UPDATE demo_clock SET current_day = current_day + 1 WHERE id = 1")
        conn.commit()
    finally:
        conn.close()
    return run_scheduler_pass()


def simulate_reply(lead_id: int, body: str | None = None) -> dict:
    """An inbound reply. Pauses the sequence permanently and fires the hot alert."""
    day = get_current_day()
    conn = get_conn()
    try:
        lead = conn.execute("SELECT * FROM leads WHERE id = ?", (lead_id,)).fetchone()
        if lead is None:
            raise LookupError(f"no lead {lead_id}")
        if lead["replied_at"] is not None:
            raise ValueError(f"lead {lead_id} has already replied")
        if lead["opted_out"]:
            raise ValueError(f"lead {lead_id} has opted out")
        # A reply only makes sense while the lead is still active. Booked, cold, and
        # claimed are terminal or human-owned -- an inbound reply there would flip a
        # settled lead back to 'replied' and fire a false hot alert. Guarded here so
        # the rule holds even when the API is called directly, not just via the UI.
        if lead["status"] not in CLAIMABLE:
            raise ValueError(f"lead {lead_id} is {lead['status']}; only an active lead can reply")

        text = body or "Thanks for following up — this is good timing. Can we talk this week?"
        conn.execute(
            """INSERT INTO touches (lead_id, kind, channel, body, day, was_real_send)
               VALUES (?, 'inbound_reply', 'email', ?, ?, 0)""",
            (lead_id, text, day),
        )
        conn.execute(
            """INSERT INTO touches (lead_id, kind, channel, body, day, was_real_send)
               VALUES (?, 'hot_alert', 'system', ?, ?, 0)""",
            (
                lead_id,
                f"HOT LEAD: {lead['name']} ({lead['company']}) replied on day {day}. Sequence paused.",
                day,
            ),
        )
        # next_action_at = NULL is belt; status and replied_at are both braces.
        conn.execute(
            """UPDATE leads
               SET status = 'replied', replied_at = ?, next_action_at = NULL
               WHERE id = ?""",
            (day, lead_id),
        )
        conn.commit()
    finally:
        conn.close()

    return {"lead_id": lead_id, "name": lead["name"], "day": day}


# --- The human-first workflow ----------------------------------------------------
#
# A claimed lead is owned by a person. It leaves the AI's reach the same way a replied
# lead does: by not appearing in DUE_LEADS_SQL. No flag is checked at send time.


def claim(lead_id: int, by: str = "Jordan Ellis") -> dict:
    """A human takes the lead. The AI sender can no longer see it."""
    day = get_current_day()
    conn = get_conn()
    try:
        lead = _load(conn, lead_id)
        if lead["status"] == "claimed":
            raise ValueError(f"lead {lead_id} is already claimed")
        if lead["status"] not in CLAIMABLE:
            raise ValueError(f"lead {lead_id} is {lead['status']} and cannot be claimed")
        if lead["opted_out"]:
            raise ValueError(f"lead {lead_id} has opted out")

        _event(conn, lead_id, f"{by} claimed this lead. AI follow-ups paused.", day)
        conn.execute(
            """UPDATE leads
               SET status = 'claimed', next_action_at = NULL, claim_token = NULL
               WHERE id = ?""",
            (lead_id,),
        )
        conn.commit()
    finally:
        conn.close()
    return {"lead_id": lead_id, "name": lead["name"], "status": "claimed"}


def hand_to_ai(lead_id: int) -> dict:
    """Give a lead to the AI.

    From 'new' this is the owner answering the alert with "let AI handle it".
    From 'claimed' it is a hand-back. Either way the lead resumes at whatever step
    its own touch history says is next.
    """
    day = get_current_day()
    conn = get_conn()
    try:
        lead = _load(conn, lead_id)
        if lead["status"] not in ("claimed", "new"):
            raise ValueError(f"lead {lead_id} is {lead['status']}; cannot hand it to the AI")
        if lead["opted_out"]:
            raise ValueError(f"lead {lead_id} has opted out")
        was_new = lead["status"] == "new"

        already = conn.execute(
            "SELECT count(*) n FROM touches WHERE lead_id = ? AND kind LIKE 'follow_up_%'",
            (lead_id,),
        ).fetchone()["n"]
        if already >= 3:
            raise ValueError(f"lead {lead_id} has had all 3 follow-ups; nothing left to send")

        # 0 sent -> contacted (fu1 next). 1 sent -> follow_up_1 (fu2 next). And so on.
        resume = "contacted" if already == 0 else f"follow_up_{already}"
        _event(
            conn,
            lead_id,
            "Owner handed this lead to the AI. Follow-up sequence started."
            if was_new
            else "Handed back to the AI. Follow-up sequence resumed.",
            day,
        )
        # gap_1 is the silence before the first follow-up (contact -> fu1).
        conn.execute(
            """UPDATE leads SET status = ?, next_action_at = ?, claim_token = NULL
               WHERE id = ?""",
            (resume, day + get_settings()["gap_1"], lead_id),
        )
        conn.commit()
    finally:
        conn.close()
    return {"lead_id": lead_id, "name": lead["name"], "status": resume, "follow_ups_sent": already}


def add_note(lead_id: int, body: str, by: str = "Jordan Ellis") -> dict:
    """What the human actually talked about. Claimed leads only."""
    text = " ".join(body.split())
    if not text:
        raise ValueError("a note cannot be empty")

    day = get_current_day()
    conn = get_conn()
    try:
        lead = _load(conn, lead_id)
        if lead["status"] != "claimed":
            raise ValueError(f"lead {lead_id} is {lead['status']}; only claimed leads take notes")

        conn.execute(
            """INSERT INTO touches (lead_id, kind, channel, body, day, was_real_send)
               VALUES (?, 'note', 'system', ?, ?, 0)""",
            (lead_id, f"{by}: {text}", day),
        )
        conn.commit()
    finally:
        conn.close()
    return {"lead_id": lead_id, "day": day}


def set_outcome(lead_id: int, outcome: str) -> dict:
    """Close a claimed lead: won or lost."""
    if outcome not in ("booked", "lost"):
        raise ValueError("outcome must be 'booked' or 'lost'")

    day = get_current_day()
    conn = get_conn()
    try:
        lead = _load(conn, lead_id)
        if lead["status"] != "claimed":
            raise ValueError(f"lead {lead_id} is {lead['status']}, not claimed")

        status = "booked" if outcome == "booked" else "cold"
        _event(
            conn,
            lead_id,
            "Marked booked by the team." if outcome == "booked" else "Marked lost by the team.",
            day,
        )
        conn.execute(
            "UPDATE leads SET status = ?, next_action_at = NULL WHERE id = ?",
            (status, lead_id),
        )
        conn.commit()
    finally:
        conn.close()
    return {"lead_id": lead_id, "name": lead["name"], "status": status}
