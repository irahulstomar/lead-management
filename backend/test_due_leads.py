"""Invariant guard for the one query that decides who gets messaged.

`DUE_LEADS_SQL` is Baton's strongest promise: a replied, opted-out, booked, cold,
or human-claimed lead is NEVER selected to receive a follow-up -- not skipped by an
`if`, but unreachable by construction. This test builds a fresh schema in memory,
seeds one lead of every relevant shape, and asserts the query returns exactly the
active-and-due ones. If a future edit widens the status list or drops a guard, this
fails loudly instead of the AI quietly messaging a lead a human is handling.

Standalone, no pytest: `python test_due_leads.py` -> "PASS" and exit 0, or the
failing assertion and exit 1. Independent of seed.py so seed drift can't mask a bug.
"""

import sqlite3
import sys
from pathlib import Path

from db import DUE_LEADS_SQL, STALE_BREAKUP_SQL

SCHEMA = (Path(__file__).parent / "schema.sql").read_text(encoding="utf-8")

DAY = 10  # "today" for every case below

# Sensible defaults for a NOT-NULL-heavy row; each case overrides only what matters.
DEFAULTS = dict(
    name="Test Lead", email="t@example.com", phone=None, company="Acme",
    city="Austin", source="website_form", message="hi", score=50,
    urgency="medium", intent="wants help", status="contacted",
    next_action_at=DAY, replied_at=None, opted_out=0, claim_token=None,
    campaign_id=None, fallback_1="f1", fallback_2="f2", fallback_3="f3",
    created_at=0,
)

COLS = list(DEFAULTS)


def make(conn, label, **over):
    """Insert one lead, returning (id, label) so failures name the offending case."""
    row = {**DEFAULTS, **over}
    placeholders = ", ".join(f":{c}" for c in COLS)
    cur = conn.execute(
        f"INSERT INTO leads ({', '.join(COLS)}) VALUES ({placeholders})", row
    )
    return cur.lastrowid, label


def build():
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)

    cases = {
        # --- Should be selected: active, unanswered, and due today or earlier. -----
        "eligible new (SLA lapsed)": dict(status="new", next_action_at=DAY, eligible=True),
        "eligible contacted": dict(status="contacted", next_action_at=DAY, eligible=True),
        "eligible follow_up_1": dict(status="follow_up_1", next_action_at=DAY - 1, eligible=True),
        "eligible follow_up_2": dict(status="follow_up_2", next_action_at=DAY, eligible=True),
        # --- Must NEVER be selected. -----------------------------------------------
        "replied": dict(status="replied", replied_at=3, next_action_at=None, eligible=False),
        # Adversarial: status left active but a reply landed -- replied_at guards it.
        "active row that replied": dict(status="contacted", replied_at=3, next_action_at=DAY, eligible=False),
        "opted out": dict(status="contacted", opted_out=1, next_action_at=DAY, eligible=False),
        "claimed by human": dict(status="claimed", next_action_at=None, eligible=False),
        "booked": dict(status="booked", next_action_at=None, eligible=False),
        "cold": dict(status="cold", next_action_at=None, eligible=False),
        "follow_up_3 (breakup, not a send)": dict(status="follow_up_3", next_action_at=DAY, eligible=False),
        "active but not due yet": dict(status="contacted", next_action_at=DAY + 5, eligible=False),
        "active but next_action_at NULL": dict(status="contacted", next_action_at=None, eligible=False),
    }

    expected_due = set()
    labels = {}
    for label, spec in cases.items():
        eligible = spec.pop("eligible")
        lead_id, _ = make(conn, label, **spec)
        labels[lead_id] = label
        if eligible:
            expected_due.add(lead_id)

    conn.commit()
    return conn, expected_due, labels


def main():
    conn, expected_due, labels = build()
    failures = []

    got = {r["id"] for r in conn.execute(DUE_LEADS_SQL, {"current_day": DAY}).fetchall()}

    for lead_id in got - expected_due:
        failures.append(f"DUE_LEADS_SQL selected a protected lead: {labels[lead_id]!r}")
    for lead_id in expected_due - got:
        failures.append(f"DUE_LEADS_SQL dropped an eligible lead: {labels[lead_id]!r}")

    # STALE_BREAKUP_SQL: only the due follow_up_3 lead, and it moves status, never sends.
    stale = {r["id"] for r in conn.execute(STALE_BREAKUP_SQL, {"current_day": DAY}).fetchall()}
    stale_expected = {i for i, lbl in labels.items() if lbl.startswith("follow_up_3")}
    if stale != stale_expected:
        failures.append(f"STALE_BREAKUP_SQL selected {stale}, expected {stale_expected}")

    if failures:
        print("FAIL")
        for f in failures:
            print("  " + f)
        sys.exit(1)

    print(f"PASS -- {len(expected_due)} eligible selected, "
          f"{len(labels) - len(expected_due)} protected leads correctly excluded")


if __name__ == "__main__":
    main()
