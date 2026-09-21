"""Resend delivery. The one place this demo touches the outside world.

NOTE the filename. `email.py` would shadow Python's stdlib `email` package, which
httpx and requests both import, and the breakage is silent and baffling.

Same fallback discipline as gemini.py: no API key means log a warning and carry on.
Every button in the dashboard works without email. The email is a convenience, not a
dependency -- but a silent no-send would make a broken demo look like a working one,
so it is always announced.
"""

import logging
import os
import secrets
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

log = logging.getLogger(__name__)

# Resend's free tier will only deliver to a verified address unless you verify a domain.
FROM = "Northbeam Partners <onboarding@resend.dev>"
API_BASE = os.environ.get("API_BASE", "http://127.0.0.1:8000")


class NoMailer(Exception):
    """No RESEND_API_KEY or DEMO_INBOX. Caller records the touch as not-really-sent."""


def new_claim_token() -> str:
    return secrets.token_urlsafe(24)


def _send(subject: str, html: str) -> None:
    key = os.environ.get("RESEND_API_KEY")
    inbox = os.environ.get("DEMO_INBOX")
    if not key or not inbox:
        raise NoMailer("RESEND_API_KEY or DEMO_INBOX is not set")

    import resend

    resend.api_key = key
    resend.Emails.send({"from": FROM, "to": [inbox], "subject": subject, "html": html})


def _p(text: str) -> str:
    """Escape lead-supplied text before it lands in an HTML email."""
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def send_lead_ack(lead, body: str) -> bool:
    """The instant, personalised acknowledgement. Returns True if it really sent."""
    html = f"<div style='font-family:sans-serif;white-space:pre-line'>{_p(body)}</div>"
    try:
        _send(f"Re: your enquiry — {_p(lead['company'] or lead['name'])}", html)
        return True
    except Exception as exc:
        log.warning("lead ack not sent for lead %s: %s: %s", lead["id"], type(exc).__name__, exc)
        return False


def send_owner_alert(lead, token: str) -> bool:
    """Tell the owner a lead landed, and give them one click to decide."""
    take = f"{API_BASE}/api/claim/{token}?action=take"
    ai = f"{API_BASE}/api/claim/{token}?action=ai"

    html = f"""
    <div style="font-family:sans-serif;max-width:520px">
      <h2 style="margin:0 0 4px">{_p(lead['name'])}</h2>
      <p style="margin:0 0 16px;color:#636b78">
        {_p(lead['company'] or '')} · {_p(lead['city'] or '')} · via {_p(lead['source'])}
      </p>
      <table style="border-collapse:collapse;margin-bottom:16px">
        <tr><td style="padding:2px 16px 2px 0;color:#636b78">Score</td>
            <td><b>{lead['score']}/100</b></td></tr>
        <tr><td style="padding:2px 16px 2px 0;color:#636b78">Urgency</td>
            <td><b>{_p(str(lead['urgency']))}</b></td></tr>
        <tr><td style="padding:2px 16px 2px 0;color:#636b78">Wants</td>
            <td><b>{_p(str(lead['intent']))}</b></td></tr>
      </table>
      <blockquote style="margin:0 0 20px;padding:12px 16px;background:#f5f6f8;
                         border-left:3px solid #d9dce1;color:#111827">
        {_p(lead['message'])}
      </blockquote>
      <a href="{take}" style="display:inline-block;padding:10px 18px;margin-right:8px;
         background:#2563eb;color:#fff;border-radius:8px;text-decoration:none">I'll take it</a>
      <a href="{ai}" style="display:inline-block;padding:10px 18px;
         border:1px solid #d9dce1;color:#111827;border-radius:8px;text-decoration:none">
         Let AI handle it</a>
      <p style="margin-top:20px;color:#636b78;font-size:13px">
        If nobody responds within 2 hours, the AI picks this lead up automatically.
      </p>
    </div>
    """
    try:
        _send(f"🔔 New lead: {_p(lead['name'])} ({_p(lead['company'] or '')}) — score {lead['score']}", html)
        return True
    except Exception as exc:
        log.warning("owner alert not sent for lead %s: %s: %s", lead["id"], type(exc).__name__, exc)
        return False
