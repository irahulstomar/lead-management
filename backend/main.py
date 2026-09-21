"""FastAPI surface for the dashboard. Local-only demo: no auth, CORS to the dev server."""

import html
import os
from typing import Annotated
from urllib.parse import quote

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel, Field, StringConstraints

import engine
import templates
from db import get_settings, query, save_settings

app = FastAPI(title="Lead Follow-Up Engine")

# Where the owner's alert-email links land. The pipeline view, not the overview page —
# a claim decision should drop you on the lead you just decided about.
LEADS_PAGE = "http://localhost:3000/leads"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class ReplyIn(BaseModel):
    body: str | None = Field(default=None, max_length=1000)


class NoteIn(BaseModel):
    # Strip first, then require content -- otherwise "   " is three valid characters.
    body: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)
    ]


class OutcomeIn(BaseModel):
    outcome: str = Field(pattern="^(booked|lost)$")


# Owner input -- validated at the boundary like everything else. Bounds keep the demo
# coherent (a 400-day gap or an empty intent would be nonsense) and cap prompt-bound text.
_Intent = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]


class SettingsIn(BaseModel):
    sla_hours: int = Field(ge=1, le=72)
    gap_1: int = Field(ge=1, le=60)
    gap_2: int = Field(ge=1, le=60)
    gap_3: int = Field(ge=1, le=60)
    intent_1: _Intent
    intent_2: _Intent
    intent_3: _Intent


ACTION_LABEL = {"take": "I'll take it", "ai": "Let AI handle it"}


def _confirm_page(token: str, action: str, name: str) -> str:
    """One button, one decision. Everything interpolated here came from outside -- the
    token off the URL, the name off a lead -- so both are escaped for the context they
    land in."""
    url = f"/api/claim/{quote(token, safe='')}?action={action}"
    return f"""<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Confirm — Baton</title></head>
<body style="margin:0;height:100vh;display:grid;place-items:center;background:#f5f6f8;
             font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#111827">
  <div style="max-width:400px;padding:28px 32px;background:#fff;border:1px solid #e8eaed;
              border-radius:12px">
    <p style="margin:0 0 4px;font-size:12px;color:#636b78">Northbeam Partners</p>
    <h1 style="margin:0 0 8px;font-size:17px">{html.escape(name)}</h1>
    <p style="margin:0 0 20px;font-size:13px;line-height:1.5;color:#636b78">
      Nothing has changed yet. Confirm below and this lead is yours — or the AI&rsquo;s.
    </p>
    <form method="post" action="{html.escape(url, quote=True)}">
      <button type="submit"
              style="padding:10px 18px;font-size:13px;font-weight:500;color:#fff;
                     background:#2563eb;border:0;border-radius:8px;cursor:pointer">
        {html.escape(ACTION_LABEL[action])}
      </button>
    </form>
    <p style="margin:20px 0 0;font-size:12px;color:#636b78">This link works once.</p>
  </div>
</body>
</html>"""


def _guard(fn, *args):
    """Every mutation answers the same way: 404 if absent, 409 if the state forbids it."""
    try:
        return fn(*args)
    except LookupError:
        raise HTTPException(404, "lead not found")
    except ValueError as exc:
        raise HTTPException(409, str(exc))


@app.get("/api/leads")
def list_leads():
    return {
        "current_day": engine.get_current_day(),
        "leads": [dict(r) for r in query("SELECT * FROM leads ORDER BY id")],
    }


@app.get("/api/leads/{lead_id}")
def get_lead(lead_id: int):
    rows = query(
        """SELECT l.*, c.name AS campaign_name
           FROM leads l LEFT JOIN campaigns c ON c.id = l.campaign_id
           WHERE l.id = ?""",
        (lead_id,),
    )
    if not rows:
        raise HTTPException(404, "lead not found")
    touches = query("SELECT * FROM touches WHERE lead_id = ? ORDER BY day, id", (lead_id,))
    return {"lead": dict(rows[0]), "touches": [dict(t) for t in touches]}


@app.post("/api/advance-day")
def advance_day():
    return engine.advance_day()


@app.post("/api/leads/{lead_id}/simulate-reply")
def simulate_reply(lead_id: int, payload: ReplyIn):
    return _guard(engine.simulate_reply, lead_id, payload.body)


@app.post("/api/leads/{lead_id}/claim")
def claim(lead_id: int):
    return _guard(engine.claim, lead_id)


@app.post("/api/leads/{lead_id}/hand-to-ai")
def hand_to_ai(lead_id: int):
    return _guard(engine.hand_to_ai, lead_id)


@app.post("/api/leads/{lead_id}/notes")
def add_note(lead_id: int, payload: NoteIn):
    return _guard(engine.add_note, lead_id, payload.body)


@app.post("/api/leads/{lead_id}/outcome")
def set_outcome(lead_id: int, payload: OutcomeIn):
    return _guard(engine.set_outcome, lead_id, payload.outcome)


@app.get("/api/claim/{token}", response_class=HTMLResponse)
def claim_confirm(token: str, action: str):
    """The two links in the owner's alert email land here, and this GET changes nothing.

    Mail clients, spam filters and corporate link scanners fetch every URL in an email
    before a human ever sees it. If clicking were the same as fetching, a scanner would
    claim the lead -- or hand it to the AI -- on the owner's behalf, and the owner's
    real decision would find a spent token. So the link only *offers* the decision. The
    confirm button POSTs it, and only a person can press that.

    A spent or unknown token lands the owner on the pipeline rather than an error page:
    by then the decision has already been made, one way or another.
    """
    if action not in ACTION_LABEL:
        raise HTTPException(400, "action must be 'take' or 'ai'")

    rows = query("SELECT id, name FROM leads WHERE claim_token = ?", (token,))
    if not rows:
        return RedirectResponse(LEADS_PAGE, status_code=302)

    return HTMLResponse(_confirm_page(token, action, rows[0]["name"]))


@app.post("/api/claim/{token}")
def claim_by_token(token: str, action: str):
    """The decision itself, from the confirmation page's button.

    Tokens are single-use: claim() and hand_to_ai() both null the token, so whichever
    link is used first wins and the other goes dead -- a replayed POST matches nothing.
    """
    if action not in ACTION_LABEL:
        raise HTTPException(400, "action must be 'take' or 'ai'")

    rows = query("SELECT id FROM leads WHERE claim_token = ?", (token,))
    # 303, not 302: the browser must follow a POST redirect with a GET.
    if not rows:
        return RedirectResponse(LEADS_PAGE, status_code=303)

    lead_id = rows[0]["id"]
    _guard(engine.claim if action == "take" else engine.hand_to_ai, lead_id)
    return RedirectResponse(f"{LEADS_PAGE}?lead={lead_id}", status_code=303)


@app.get("/api/stats")
def stats():
    one = lambda sql: query(sql)[0]["n"]  # noqa: E731
    return {
        "current_day": engine.get_current_day(),
        "total_leads": one("SELECT count(*) n FROM leads"),
        "hot_leads": one("SELECT count(*) n FROM leads WHERE status = 'replied'"),
        "booked": one("SELECT count(*) n FROM leads WHERE status = 'booked'"),
        "awaiting_decision": one("SELECT count(*) n FROM leads WHERE status = 'new'"),
        "claimed": one("SELECT count(*) n FROM leads WHERE status = 'claimed'"),
        "follow_ups_sent": one("SELECT count(*) n FROM touches WHERE kind LIKE 'follow_up_%'"),
    }


# --- Read-only views. None of these can change a lead's state. -------------------


@app.get("/api/activity")
def activity(limit: int = 12):
    limit = max(1, min(50, limit))
    rows = query(
        """SELECT t.id, t.lead_id, t.kind, t.body, t.day, t.was_real_send,
                  l.name AS lead_name, l.company AS lead_company
           FROM touches t JOIN leads l ON l.id = t.lead_id
           ORDER BY t.day DESC, t.id DESC LIMIT ?""",
        (limit,),
    )
    return {"activity": [dict(r) for r in rows]}


@app.get("/api/notifications")
def notifications():
    """Everything that was supposed to reach a human: new-lead alerts and hot-lead alerts."""
    rows = query(
        """SELECT t.id, t.lead_id, t.kind, t.body, t.day, t.was_real_send,
                  l.name AS lead_name, l.company AS lead_company
           FROM touches t JOIN leads l ON l.id = t.lead_id
           WHERE t.kind IN ('owner_alert', 'hot_alert')
           ORDER BY t.day DESC, t.id DESC""",
    )
    return {"notifications": [dict(r) for r in rows]}


@app.get("/api/campaigns")
def campaigns():
    """Meta lead-ad campaigns, with what each one actually produced.

    Cost per lead is the number every ads dashboard shows. Cost per booked call is the
    one that matters, and Baton can compute it because it knows what happened after the
    lead arrived. A campaign with no bookings yet returns null rather than a fake zero.
    """
    rows = query(
        """SELECT c.*,
                  count(l.id)                                        AS lead_count,
                  sum(CASE WHEN l.status = 'replied' THEN 1 ELSE 0 END) AS replied,
                  sum(CASE WHEN l.status = 'booked'  THEN 1 ELSE 0 END) AS booked
           FROM campaigns c LEFT JOIN leads l ON l.campaign_id = c.id
           GROUP BY c.id ORDER BY c.id"""
    )

    out = []
    for r in rows:
        c = dict(r)
        c["replied"] = c["replied"] or 0
        c["booked"] = c["booked"] or 0
        c["ctr"] = (c["clicks"] / c["impressions"]) if c["impressions"] else None
        c["cpl"] = (c["spend"] / c["lead_count"]) if c["lead_count"] else None
        c["cost_per_booked"] = (c["spend"] / c["booked"]) if c["booked"] else None
        out.append(c)

    spend = sum(c["spend"] for c in out)
    leads = sum(c["lead_count"] for c in out)
    booked = sum(c["booked"] for c in out)
    return {
        "campaigns": out,
        "totals": {
            "spend": spend,
            "leads": leads,
            "booked": booked,
            "cpl": (spend / leads) if leads else None,
            "cost_per_booked": (spend / booked) if booked else None,
        },
    }


@app.get("/api/analytics")
def analytics():
    """Counts only. With 16 seeded leads, rates would be noise dressed as insight."""
    by_status = {r["status"]: r["n"] for r in query("SELECT status, count(*) n FROM leads GROUP BY status")}
    g = by_status.get

    # The state buckets below partition every lead, so they sum to "Arrived". Cold is
    # included for exactly that reason -- without it the bars silently fail to add up.
    funnel = [
        {"stage": "Arrived", "count": sum(by_status.values())},
        {"stage": "Awaiting a human", "count": g("new", 0)},
        {"stage": "In sequence", "count": g("contacted", 0) + g("follow_up_1", 0) + g("follow_up_2", 0) + g("follow_up_3", 0)},
        {"stage": "Human-owned", "count": g("claimed", 0)},
        {"stage": "Replied", "count": g("replied", 0)},
        {"stage": "Booked", "count": g("booked", 0)},
        {"stage": "Cold", "count": g("cold", 0)},
    ]

    by_source = [
        dict(r)
        for r in query(
            """SELECT source,
                      count(*)                                          AS leads,
                      sum(CASE WHEN status = 'replied' THEN 1 ELSE 0 END) AS replied,
                      sum(CASE WHEN status = 'booked'  THEN 1 ELSE 0 END) AS booked
               FROM leads GROUP BY source ORDER BY leads DESC"""
        )
    ]
    return {"funnel": funnel, "by_source": by_source, "total_leads": sum(by_status.values())}


@app.get("/api/settings")
def read_settings():
    """The owner-editable engine config: SLA, the three follow-up gaps, and each step's intent."""
    return get_settings()


@app.post("/api/settings")
def write_settings(payload: SettingsIn):
    """Persist the config. The engine reads it on the next pass -- no restart. Structurally
    cannot touch a lead's state; it only changes timing and drafting guidance going forward."""
    save_settings(payload.model_dump())
    return get_settings()


@app.get("/api/templates")
def message_templates():
    """The approved templates. The envelope (greeting/sign-off) is fixed in templates.py;
    each step's intent comes from Settings, so this page reflects what the owner configured."""
    example = ("Alex Rivera", "Rivera Contracting")
    cfg = get_settings()
    return {
        "agency": templates.AGENCY,
        "rep": templates.REP,
        "signature": templates.SIGNATURE,
        "steps": [
            {
                "step": step,
                "intent": cfg[f"intent_{step}"],
                "example": templates.fallback_message(*example, step),
            }
            for step in (1, 2, 3)
        ],
    }


@app.get("/api/status")
def integration_status():
    """Whether the integrations are configured. Booleans ONLY -- this endpoint must
    never read, log, or return key material."""
    return {
        "gemini_configured": bool(os.environ.get("GEMINI_API_KEY")),
        "resend_configured": bool(os.environ.get("RESEND_API_KEY") and os.environ.get("DEMO_INBOX")),
    }
