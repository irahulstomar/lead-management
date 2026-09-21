"""Approved message templates.

Gemini writes the body slot only. The greeting and the sign-off are ours, so a
model response can never change who the message claims to be from. The fallback
bodies are used verbatim when Gemini is unreachable.

The follow-up arc is fixed:
    step 1 = value-add    step 2 = gentle nudge    step 3 = polite breakup
"""

AGENCY = "Northbeam Partners"
REP = "Jordan Ellis"
SIGNATURE = f"— {REP}, {AGENCY}"

STEP_INTENT = {
    1: "value-add: share one concrete, useful observation relevant to what they asked about",
    2: "gentle nudge: check whether the timing is still right, no pressure",
    3: "polite breakup: close the loop gracefully and leave the door open",
}


def first_name(name: str) -> str:
    return name.split()[0]


def envelope(name: str, body: str) -> str:
    """Wrap a body slot in the approved greeting and sign-off."""
    return f"Hi {first_name(name)},\n\n{body.strip()}\n\n{SIGNATURE}"


def fallback_body(name: str, company: str, step: int) -> str:
    """Deterministic copy used when Gemini is unreachable. Grounded in nothing
    but the lead's own name and company, so it can never state a false fact."""
    if step == 1:
        return (
            "Following up on your note. In our experience the fastest win is usually tightening "
            "response time before anything else — the first hour after an enquiry matters more "
            "than the month that follows it. Happy to walk you through what that looks like in "
            "practice if it would be useful."
        )
    if step == 2:
        return (
            "Circling back on this one. I know priorities shift — if the timing isn't right "
            "just now, that's completely fine. Would it help if I checked back in a few weeks "
            "instead?"
        )
    return (
        "I don't want to keep landing in your inbox, so this'll be my last note on this. "
        f"If things change at {company}, you know where to find me — I'd be glad to pick it "
        "back up whenever the timing suits you."
    )


def fallback_message(name: str, company: str, step: int) -> str:
    return envelope(name, fallback_body(name, company, step))
