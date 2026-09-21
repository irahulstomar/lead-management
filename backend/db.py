"""SQLite access for the lead engine. Parameterized queries only."""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "leads.db"
SCHEMA_PATH = Path(__file__).parent / "schema.sql"

# The ONLY query that ever selects leads to be messaged.
#
# A lead that has replied, opted out, been booked, gone cold, or been CLAIMED BY A
# HUMAN is unreachable from here by construction. This rule is enforced in SQL rather
# than asked of the model: Gemini never decides whether to send, only what to write,
# after this query has already decided. Do not add a second selection path.
#
# 'new' IS here: an unclaimed lead whose 2-hour SLA has lapsed gets picked up by the
# AI on the next pass. 'claimed' is NOT here, and that omission is the guarantee.
DUE_LEADS_SQL = """
SELECT * FROM leads
WHERE status IN ('new', 'contacted', 'follow_up_1', 'follow_up_2')
  AND replied_at IS NULL
  AND opted_out = 0
  AND next_action_at <= :current_day
ORDER BY id
"""

# Leads whose breakup message has aged out. This moves status only -- it never
# sends anything -- so it is deliberately kept separate from DUE_LEADS_SQL.
STALE_BREAKUP_SQL = """
SELECT * FROM leads
WHERE status = 'follow_up_3'
  AND replied_at IS NULL
  AND opted_out = 0
  AND next_action_at <= :current_day
ORDER BY id
"""


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def query(sql: str, params=()) -> list[sqlite3.Row]:
    conn = get_conn()
    try:
        return conn.execute(sql, params).fetchall()
    finally:
        conn.close()


def execute(sql: str, params=()) -> int:
    """Run a write and return lastrowid."""
    conn = get_conn()
    try:
        cur = conn.execute(sql, params)
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()


def get_settings() -> dict:
    """The owner-editable engine config, as a plain dict. Falls back to the original
    defaults if the row is missing (e.g. the engine is exercised before a seed)."""
    conn = get_conn()
    try:
        row = conn.execute("SELECT * FROM settings WHERE id = 1").fetchone()
    finally:
        conn.close()
    if row is not None:
        return dict(row)
    from templates import STEP_INTENT  # lazy: keeps db import-light and cycle-free

    return {
        "sla_hours": 2, "gap_1": 1, "gap_2": 3, "gap_3": 7,
        "intent_1": STEP_INTENT[1], "intent_2": STEP_INTENT[2], "intent_3": STEP_INTENT[3],
    }


# Which columns the owner may write. `id` is fixed at 1 and never accepted from a client.
SETTINGS_FIELDS = ("sla_hours", "gap_1", "gap_2", "gap_3", "intent_1", "intent_2", "intent_3")


def save_settings(values: dict) -> None:
    conn = get_conn()
    try:
        conn.execute(
            f"UPDATE settings SET {', '.join(f'{c} = :{c}' for c in SETTINGS_FIELDS)} WHERE id = 1",
            {c: values[c] for c in SETTINGS_FIELDS},
        )
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    """Drop and recreate the database from schema.sql."""
    DB_PATH.unlink(missing_ok=True)
    conn = get_conn()
    try:
        conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
        conn.commit()
    finally:
        conn.close()
