"""What happens between "this lead is due" and "this lead was messaged".

`test_due_leads.py` proves DUE_LEADS_SQL never *selects* a protected lead. That is only
half the promise: selection happens, then Gemini drafts for several seconds, then the
writes land. Two things can go wrong inside that gap.

  1. The lead moves while the model is drafting -- they reply, they opt out, a human
     claims them. The pass must not record a send for them.
  2. Gemini answers with a drafts list that does not line up with the leads it was
     asked about. A repeated, invented or missing lead_id is how one lead's paragraph
     ends up addressed to another.

Both are proved here against a throwaway database in the system temp dir. `leads.db` is
never opened, so a failing run cannot corrupt the seeded demo.

Standalone, no pytest: `python test_engine_safety.py` -> "PASS" and exit 0, or the
failing assertions and exit 1.
"""

import json
import sqlite3
import sys
import tempfile
from pathlib import Path

import db

# Redirect the whole backend at a temp database BEFORE anything opens a connection.
# get_conn() reads db.DB_PATH at call time, so every module that imported it follows.
DB_FILE = Path(tempfile.mkdtemp(prefix="baton-test-")) / "test.db"
db.DB_PATH = DB_FILE

import engine  # noqa: E402  -- must come after the redirect above
import gemini  # noqa: E402

SCHEMA = (Path(__file__).parent / "schema.sql").read_text(encoding="utf-8")

DAY = 20

DEFAULTS = dict(
    name="Test Lead", email="t@example.com", phone=None, company="Acme",
    city="Austin", source="website_form", message="We need help with lead follow-up.",
    score=60, urgency="medium", intent="wants help with follow-up", status="contacted",
    next_action_at=DAY, replied_at=None, opted_out=0, claim_token=None,
    campaign_id=None, fallback_1="STORED FALLBACK 1", fallback_2="STORED FALLBACK 2",
    fallback_3="STORED FALLBACK 3", created_at=0,
)
COLS = list(DEFAULTS)

failures: list[str] = []


def check(ok: bool, msg: str) -> None:
    if not ok:
        failures.append(msg)


def build(*leads: dict) -> None:
    """A fresh database holding exactly these leads, at day DAY, with default settings."""
    DB_FILE.unlink(missing_ok=True)
    conn = sqlite3.connect(DB_FILE)
    conn.executescript(SCHEMA)
    conn.execute("INSERT INTO demo_clock (id, current_day) VALUES (1, ?)", (DAY,))
    conn.execute(
        """INSERT INTO settings (id, sla_hours, gap_1, gap_2, gap_3, intent_1, intent_2, intent_3)
           VALUES (1, 2, 1, 3, 7, 'value-add', 'gentle nudge', 'polite breakup')"""
    )
    for spec in leads:
        row = {**DEFAULTS, **spec}
        conn.execute(
            f"INSERT INTO leads ({', '.join(COLS)}) "
            f"VALUES ({', '.join(f':{c}' for c in COLS)})",
            row,
        )
    conn.commit()
    conn.close()


def lead_row(lead_id: int) -> sqlite3.Row:
    conn = db.get_conn()
    try:
        return conn.execute("SELECT * FROM leads WHERE id = ?", (lead_id,)).fetchone()
    finally:
        conn.close()


def follow_ups(lead_id: int) -> int:
    conn = db.get_conn()
    try:
        return conn.execute(
            "SELECT count(*) n FROM touches WHERE lead_id = ? AND kind LIKE 'follow_up_%'",
            (lead_id,),
        ).fetchone()["n"]
    finally:
        conn.close()


# --- 1. The lead moves while Gemini is drafting ----------------------------------


def test_state_change_during_drafting() -> None:
    """Three leads are selected as due. While the model is "thinking", one replies, one
    is claimed by a human, and one opts out. Only the untouched lead may be messaged."""
    build(
        dict(name="Marcus Webb", status="contacted", next_action_at=DAY),      # id 1: stays put
        dict(name="Danielle Cho", status="contacted", next_action_at=DAY),     # id 2: replies
        dict(name="Kevin Ruiz", status="follow_up_1", next_action_at=DAY),     # id 3: claimed
        dict(name="Angela Pike", status="follow_up_2", next_action_at=DAY),    # id 4: opts out
    )

    real_draft_batch = gemini.draft_batch

    def racing_draft_batch(items):
        # The world moves while the model writes. Each of these is a real engine call,
        # exactly as the API would make it from another request mid-pass.
        engine.simulate_reply(2)
        engine.claim(3)
        conn = db.get_conn()
        conn.execute("UPDATE leads SET opted_out = 1 WHERE id = 4")
        conn.commit()
        conn.close()
        return {lead["id"]: f"Draft for lead {lead['id']}." for lead, _ in items}

    gemini.draft_batch = racing_draft_batch
    try:
        result = engine.run_scheduler_pass()
    finally:
        gemini.draft_batch = real_draft_batch

    sent_ids = sorted(s["lead_id"] for s in result["sent"])
    check(sent_ids == [1], f"only the untouched lead may be sent to; got {sent_ids}")

    check(lead_row(1)["status"] == "follow_up_1", "the eligible lead should have advanced")
    check(follow_ups(1) == 1, "the eligible lead should have exactly one follow-up recorded")

    # The three that moved: state preserved, and nothing was written to them.
    check(lead_row(2)["status"] == "replied", "a lead who replied must stay 'replied'")
    check(follow_ups(2) == 0, "a lead who replied mid-draft must not be messaged")

    check(lead_row(3)["status"] == "claimed", "a claimed lead must stay 'claimed'")
    check(follow_ups(3) == 0, "a lead claimed mid-draft must not be messaged")

    check(lead_row(4)["status"] == "follow_up_2", "an opted-out lead must not advance")
    check(follow_ups(4) == 0, "a lead who opted out mid-draft must not be messaged")


def test_reply_during_drafting_blocks_the_cold_sweep() -> None:
    """Same race, terminal end: a breakup-stage lead who replies mid-pass must not be
    quietly filed as cold."""
    build(dict(name="Tom Bricker", status="follow_up_3", next_action_at=DAY))

    real_draft_batch = gemini.draft_batch

    def racing_draft_batch(items):
        engine.simulate_reply(1)
        return {}

    gemini.draft_batch = racing_draft_batch
    try:
        result = engine.run_scheduler_pass()
    finally:
        gemini.draft_batch = real_draft_batch

    check(result["cooled"] == [], f"a lead who replied must not be cooled; got {result['cooled']}")
    check(lead_row(1)["status"] == "replied", "the reply must survive the pass")


# --- 2. Gemini's batch response does not match the leads we asked about ------------


def batch_items() -> list[tuple[sqlite3.Row, int]]:
    build(
        dict(name="Marcus Webb", status="contacted"),
        dict(name="Danielle Cho", status="contacted"),
    )
    conn = db.get_conn()
    try:
        rows = conn.execute("SELECT * FROM leads ORDER BY id").fetchall()
    finally:
        conn.close()
    return [(rows[0], 1), (rows[1], 2)]


def run_batch_with(response: dict) -> dict[int, str]:
    """Drive draft_batch against a canned model response, with no network call."""
    real_call = gemini._call
    gemini._call = lambda system, prompt, schema=None: json.dumps(response)
    try:
        return gemini.draft_batch(batch_items())
    finally:
        gemini._call = real_call


def test_batch_ids_must_match() -> None:
    good = "Thanks for the note about your intake backlog. I can take a look this week."

    # Control: an exact one-to-one response IS used. Without this, a validator that
    # rejected everything would look like it was working.
    out = run_batch_with({"drafts": [{"lead_id": 1, "body": good}, {"lead_id": 2, "body": good}]})
    check(
        all("intake backlog" in out[i] for i in (1, 2)),
        "a well-formed batch response should be used, not discarded",
    )

    bad_responses = {
        "a repeated lead_id": {"drafts": [
            {"lead_id": 1, "body": good}, {"lead_id": 1, "body": good},
        ]},
        "an invented lead_id": {"drafts": [
            {"lead_id": 1, "body": good}, {"lead_id": 99, "body": good},
        ]},
        "a missing lead_id": {"drafts": [{"lead_id": 1, "body": good}]},
        "ids swapped for strangers": {"drafts": [
            {"lead_id": 7, "body": good}, {"lead_id": 8, "body": good},
        ]},
        "no drafts at all": {"drafts": []},
    }

    for label, response in bad_responses.items():
        out = run_batch_with(response)
        check(
            sorted(out) == [1, 2],
            f"{label}: every requested lead must still get a message",
        )
        # Rejecting the batch means EVERY lead falls back -- including lead 1, whose own
        # draft looked fine. A response we cannot trust to be correctly addressed is not
        # partially trustworthy.
        check(
            out.get(1) == "STORED FALLBACK 1" and out.get(2) == "STORED FALLBACK 2",
            f"{label}: the whole batch must fall back to each lead's own stored copy",
        )


def main() -> None:
    test_state_change_during_drafting()
    test_reply_during_drafting_blocks_the_cold_sweep()
    test_batch_ids_must_match()

    if failures:
        print("FAIL")
        for f in failures:
            print("  " + f)
        sys.exit(1)
    print("PASS -- protected leads survive a mid-pass state change, and a mismatched "
          "Gemini batch falls back per-lead")


if __name__ == "__main__":
    main()
