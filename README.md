# Baton

A lead follow-up engine that answers inbound leads in seconds, chases them on a timed sequence until they reply, and hands control back to a human the moment a lead responds.

> **Demo / portfolio project.** Baton runs on seeded sample data. One path is genuinely live (a landing-page form sends a real email through Resend to a test inbox); every other lead source and every inbound reply is simulated. There are no real users and no client integrations.

## The problem

Most inbound leads go cold because nobody follows up fast enough or consistently enough. A human can react quickly to one hot lead but cannot reliably chase every lead on day 1, day 3, and day 7 without dropping some. Baton keeps a human in front of fresh leads, then uses AI as the safety net: it qualifies and answers instantly, runs the timed follow-up cascade, and steps aside the instant a person wants to take over or a lead replies.

## Key features

- **Human-first claim flow.** A fresh lead is routed to the owner with a short SLA. Only when the owner passes it to AI, or the SLA lapses, does the engine take over. A human can claim a lead back at any time, and AI can never touch a human-owned lead.
- **Instant qualification.** Each lead is scored for fit, urgency, and intent by Gemini, grounded only in what the lead actually wrote.
- **Timed follow-up cascade.** A three-step sequence (day 1 value-add, day 3 nudge, day 7 polite close) drafted inside approved templates. The AI never free-chats with leads.
- **Stop-on-reply, enforced in SQL.** A lead that has replied, opted out, or been claimed by a human is never selected for a follow-up. The rule lives in the due-leads query, not in a prompt, so it is structurally impossible to message a protected lead.
- **Hot-lead alerts.** An inbound reply pauses the sequence instantly and fires an alert to the owner.
- **Owner-editable engine.** SLA hours, the three follow-up gaps, and each step's drafting intent are stored in the database and editable from the Settings page. Defaults reproduce the documented behavior.
- **Demo clock.** An "advance one day" control moves a demo clock and runs the scheduler pass, so the full week-long cascade is visible on demand. In production the same pass would run on a real cron.

## Tech stack

**Backend** (`backend/requirements.txt`)
- Python + FastAPI
- Google Gemini (`google-genai`) for qualification and drafting
- Resend for transactional email
- SQLite for storage
- python-dotenv for config

**Frontend** (`frontend/package.json`)
- Next.js 16 + React 19
- Tailwind CSS v4
- Framer Motion, lucide-react
- TypeScript

## How it works

```
Lead in                Processing                         Out
--------               ----------                         ---
website form   ─┐
lead ad        ─┤─►  qualify (Gemini: score/urgency/  ─►  owner alerted, SLA clock starts
missed call    ─┤    intent) + store lead                     │
email inquiry  ─┘                                              ├─ owner claims  ─► human-owned
                                                               └─ AI takes over ─► timed sequence
                                                                                   (day 1 / 3 / 7)
                                                                                        │
                                                          inbound reply ──────────────►─┘  pause + 🔥 alert
```

The scheduler pass selects due-and-silent leads with a single query (`DUE_LEADS_SQL`), drafts each message, then re-checks eligibility at write time as a compare-and-swap, so a lead that replies or is claimed mid-pass is never messaged.

## Run it locally

Requirements: Python 3.11+, Node 18+.

**1. Backend**

```bash
cd backend
python -m venv .venv
# Windows:  .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # then fill in the values below
python seed.py            # seed the demo database
uvicorn main:app --reload
```

Environment variables (`backend/.env`, see `backend/.env.example`):

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Gemini API key for qualification and drafting |
| `RESEND_API_KEY` | Resend API key for the one live email path |
| `DEMO_INBOX` | Test inbox that receives the demo email (Resend free tier delivers only to a verified address unless you verify a domain) |

The app runs read-only on seeded data without any keys. The keys are only needed for live qualification and the real form-to-email path.

**2. Frontend**

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000. The backend must be running for API calls to succeed.

## Screenshots / Demo

<!-- Add a demo GIF or screenshots here. -->
_Demo GIF coming soon._
