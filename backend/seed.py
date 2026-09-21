"""Seed the demo database.

Leads are staged relative to a demo clock at day 20, so that pressing the
dashboard's advance button produces a visible cascade on the very first press
and keeps producing motion for about a week.

Three rows are deliberately adversarial:
  - Derek Alvarez  : opted out, and his next_action_at is ALREADY PAST DUE.
  - Sarah Kowalski : replied, and therefore permanently out of the sequence.
  - Rebecca Lang   : claimed by a human, so the AI must never touch her.
None may ever be selected by DUE_LEADS_SQL. That is the property the whole engine
rests on, so it is seeded to be testable rather than assumed.
"""

from db import execute, get_conn, init_db
from templates import STEP_INTENT, envelope, fallback_message

START_DAY = 20

# Meta lead-ad campaigns. Seeded, not synced -- see schema.sql.
# Numbers are plausible for local US B2B lead gen: CTR around 1-2%, cost per lead in the
# $60-90 band for the healthy campaigns. Med-Spa Openers is deliberately bad -- 0.9% CTR,
# $242 a lead, nothing booked -- because a campaigns page that shows only winners is a
# brochure, not a tool. It is paused, and the page should make it obvious why.
CAMPAIGNS = [
    dict(name="Dental Practices — Austin Metro", platform="facebook", status="active",
         daily_budget=15.00, spend=142.80, impressions=12_400, clicks=214, started_day=0),
    dict(name="Gym & Studio Owners — Midwest", platform="instagram", status="active",
         daily_budget=20.00, spend=63.40, impressions=6_100, clicks=108, started_day=10),
    dict(name="Commercial Contractors — Kansas City", platform="facebook", status="active",
         daily_budget=18.00, spend=84.60, impressions=7_300, clicks=121, started_day=12),
    dict(name="Med-Spa Openers — Q2", platform="instagram", status="paused",
         daily_budget=30.00, spend=241.90, impressions=19_800, clicks=178, started_day=0),
]

DENTAL, GYM, CONTRACTORS, MEDSPA = 1, 2, 3, 4

# (kind, channel, body, day) -- was_real_send is always 0 for seeded history.
LEADS = [
    dict(
        name="Marcus Whitfield",
        email="m.whitfield@ridgelinelogistics.com",
        phone="(614) 555-0142",
        company="Ridgeline Logistics",
        city="Columbus, OH",
        source="website_form",
        message=(
            "We're opening a new freight lane out of Columbus in Q4 and we have nobody "
            "doing outbound for it. Two sales reps, no pipeline. What would it cost to "
            "get something running before the holidays?"
        ),
        score=88,
        urgency="high",
        intent="Needs outbound pipeline for a new Q4 freight lane",
        status="contacted",
        created_at=20,
        next_action_at=21,
        touches=[
            ("instant_reply", "email",
             "Thanks for reaching out about the new Columbus lane. A Q4 start with two reps "
             "and no existing pipeline is a tight but very doable window — the constraint is "
             "usually list quality, not send volume. I've got time Thursday or Friday to walk "
             "through what a build looks like from a standing start.", 20),
        ],
    ),
    dict(
        name="Danielle Ortega",
        email="dortega@brightpathdental.com",
        phone="(512) 555-0178",
        company="Brightpath Dental Group",
        city="Austin, TX",
        source="lead_ad",
        campaign_id=DENTAL,
        message=(
            "Saw your ad. We run six dental practices around Austin and our front desks are "
            "dropping new patient calls constantly. Curious what you do."
        ),
        score=74,
        urgency="medium",
        intent="Losing new-patient calls across six practices; wants intake fixed",
        status="contacted",
        created_at=20,
        next_action_at=21,
        touches=[
            ("instant_reply", "email",
             "Appreciate you clicking through. Dropped calls across six locations is almost "
             "always a routing and coverage problem rather than a staffing one, and it's very "
             "measurable — we'd start by finding out how many calls actually go unanswered in "
             "a week. Would a short call next week be useful?", 20),
        ],
    ),
    dict(
        name="Kevin Nakamura",
        email="kevin@summithvacdenver.com",
        phone="(303) 555-0119",
        company="Summit HVAC Services",
        city="Denver, CO",
        source="missed_call",
        message=(
            "Missed call from (303) 555-0119. Voicemail: looking for help generating "
            "commercial HVAC maintenance contracts, currently all word of mouth."
        ),
        score=69,
        urgency="medium",
        intent="Wants commercial maintenance contracts beyond word of mouth",
        status="follow_up_1",
        created_at=17,
        next_action_at=21,
        touches=[
            ("instant_reply", "email",
             "Sorry we missed your call. Moving off pure word-of-mouth for commercial "
             "maintenance contracts is a well-trodden path — the recurring revenue makes the "
             "math work quickly. Happy to talk through it whenever suits.", 17),
            ("follow_up_1", "email",
             "One thing worth knowing: for commercial HVAC, the maintenance contract is "
             "usually won at the property-manager level rather than the building level, which "
             "changes who you're targeting entirely. Most word-of-mouth shops are pitching one "
             "level too low.", 18),
        ],
    ),
    dict(
        name="Angela Reyes",
        email="areyes@coastlinepm.com",
        phone="(619) 555-0166",
        company="Coastline Property Management",
        city="San Diego, CA",
        source="email_inquiry",
        message=(
            "Hi — we manage about 400 doors across San Diego County. Growth has stalled and "
            "our owner acquisition is entirely referral-based. Do you work with property "
            "management companies?"
        ),
        score=81,
        urgency="medium",
        intent="Stalled owner acquisition at 400 doors; referral-dependent",
        status="follow_up_2",
        created_at=10,
        next_action_at=21,
        touches=[
            ("instant_reply", "email",
             "We do work with property managers, yes. At 400 doors, referral-only acquisition "
             "usually means growth tracks your existing owners' buying behaviour rather than "
             "your own effort — which is exactly the stall you're describing. Worth a "
             "conversation.", 10),
            ("follow_up_1", "email",
             "Following up with something concrete: the property managers we've seen break a "
             "referral plateau almost always do it by going after owners who already hold two "
             "or more doors, not first-time landlords. Smaller list, far better conversion.", 11),
            ("follow_up_2", "email",
             "Circling back on this. I know Q3 is a busy stretch in property management — if "
             "now isn't the moment, would it be more useful if I reached out again after the "
             "summer turnover season?", 14),
        ],
    ),
    dict(
        name="Tom Brennan",
        email="tom@brennanandsonsroofing.com",
        phone="(412) 555-0193",
        company="Brennan & Sons Roofing",
        city="Pittsburgh, PA",
        source="website_form",
        message=(
            "Storm season is our whole year and we're leaving money on the table because we "
            "can't keep up with the leads when it hits. Want to talk about it."
        ),
        score=63,
        urgency="low",
        intent="Cannot keep up with storm-season lead volume",
        status="follow_up_3",
        created_at=4,
        next_action_at=22,
        touches=[
            ("instant_reply", "email",
             "Storm season roofing is a capacity problem disguised as a lead problem — you "
             "don't need more leads during the surge, you need to not lose the ones you get. "
             "That's a fixable thing. Let me know when you'd like to dig in.", 4),
            ("follow_up_1", "email",
             "A useful benchmark while it's on your mind: roofers who respond to a storm lead "
             "within fifteen minutes book roughly three times as often as those who take a "
             "day. During a surge the response clock beats the pitch every time.", 5),
            ("follow_up_2", "email",
             "Checking in on this one. Storm season may well have swallowed the last few "
             "weeks — no pressure at all. Should I try you again once things quieten down?", 8),
            ("follow_up_3", "email",
             "I don't want to keep turning up in your inbox, so this will be my last note. If "
             "capacity becomes the bottleneck again next season, you know where to find me — "
             "I'd be glad to pick it up then.", 15),
        ],
    ),
    dict(
        # ADVERSARIAL: replied. Out of the sequence permanently.
        name="Sarah Kowalski",
        email="sarah.k@northgatefitness.com",
        phone="(612) 555-0107",
        company="Northgate Fitness",
        city="Minneapolis, MN",
        source="lead_ad",
        campaign_id=GYM,
        message=(
            "We're opening our third location in Minneapolis in October and want presale "
            "memberships running before we open the doors. What's your availability?"
        ),
        score=92,
        urgency="high",
        intent="Wants presale memberships before an October third-location opening",
        status="replied",
        created_at=15,
        next_action_at=None,
        replied_at=18,
        touches=[
            ("instant_reply", "email",
             "Presale before opening is the right instinct — a third location with no presale "
             "is leaving its best month on the table. October is close enough that we'd want "
             "to move soon. When are you free this week?", 15),
            ("follow_up_1", "email",
             "One thought while you're deciding: presale conversion for a new gym location "
             "tends to be driven almost entirely by the founding-member offer, not by ad "
             "spend. Worth getting that right before anything else.", 16),
            ("inbound_reply", "email",
             "This is exactly what we needed to hear. Can you do Thursday at 2pm CT? "
             "Bringing our GM on the call.", 18),
            ("hot_alert", "system",
             "HOT LEAD: Sarah Kowalski (Northgate Fitness) replied on day 18. Sequence paused.", 18),
        ],
    ),
    dict(
        # ADVERSARIAL: opted out, and next_action_at is ALREADY PAST DUE (19 < 20).
        # If DUE_LEADS_SQL is correct he is never selected, on any press, ever.
        name="Derek Alvarez",
        email="derek@alvarezautobody.com",
        phone="(602) 555-0154",
        company="Alvarez Auto Body",
        city="Phoenix, AZ",
        source="missed_call",
        message=(
            "Missed call from (602) 555-0154. Voicemail: asking about pricing for collision "
            "repair lead generation."
        ),
        score=45,
        urgency="low",
        intent="Price-checking collision repair lead generation",
        status="contacted",
        created_at=17,
        next_action_at=19,
        opted_out=1,
        touches=[
            ("instant_reply", "email",
             "Sorry we missed you. Collision repair lead gen is something we do — pricing "
             "depends mostly on how much of the intake you want handled. Glad to send over "
             "detail if useful.", 17),
            ("inbound_reply", "email",
             "Please take me off this list. Not interested.", 18),
        ],
    ),
    dict(
        name="Michelle Chen",
        email="mchen@vertexfinancialpartners.com",
        phone="(206) 555-0188",
        company="Vertex Financial Partners",
        city="Seattle, WA",
        source="website_form",
        message=(
            "Independent RIA, about $180M AUM. We want to grow without hiring another "
            "advisor first. Is that something you've done before?"
        ),
        score=90,
        urgency="high",
        intent="RIA at $180M AUM wants growth without adding headcount",
        status="booked",
        created_at=12,
        next_action_at=None,
        replied_at=14,
        touches=[
            ("instant_reply", "email",
             "Yes — growing an RIA before adding an advisor is mostly about making sure the "
             "advisor you do eventually hire walks into a full calendar. At $180M that "
             "sequencing matters a lot. Do you have twenty minutes this week?", 12),
            ("follow_up_1", "email",
             "Worth mentioning: compliance review tends to be the real constraint on RIA "
             "marketing, not creative. Teams that plan for it up front move about twice as "
             "fast as teams that discover it late.", 13),
            ("inbound_reply", "email",
             "Twenty minutes works. Friday morning if you have it.", 14),
            ("hot_alert", "system",
             "HOT LEAD: Michelle Chen (Vertex Financial Partners) replied on day 14. Sequence paused.", 14),
        ],
    ),
    dict(
        name="Raymond Poole",
        email="rpoole@pooleindustrial.com",
        phone="(216) 555-0135",
        company="Poole Industrial Supply",
        city="Cleveland, OH",
        source="email_inquiry",
        message=(
            "Wondering what you charge. We distribute industrial fasteners, mostly to "
            "contract manufacturers in Ohio and Michigan."
        ),
        score=38,
        urgency="low",
        intent="Price enquiry from an industrial fastener distributor",
        status="cold",
        created_at=0,
        next_action_at=None,
        touches=[
            ("instant_reply", "email",
             "Happy to talk pricing. For industrial distribution it usually comes down to "
             "whether you're trying to win new contract manufacturers or sell more into the "
             "ones you already have — quite different engagements. Which is it?", 0),
            ("follow_up_1", "email",
             "One observation from working with distributors: reorder rate is nearly always a "
             "bigger lever than new-account acquisition, and it's a much cheaper one. Worth "
             "checking yours before spending anything on growth.", 1),
            ("follow_up_2", "email",
             "Checking back in on this. If pricing was the sticking point, I'm glad to send "
             "something over in writing — no call needed.", 4),
            ("follow_up_3", "email",
             "This'll be my last note so I'm not cluttering your inbox. If fastener demand "
             "picks up across Ohio and Michigan and you want to talk, I'm easy to find.", 11),
        ],
    ),
    dict(
        name="Jessica Hartman",
        email="jhartman@hartmanlegalgroup.com",
        phone="(704) 555-0121",
        company="Hartman Legal Group",
        city="Charlotte, NC",
        source="website_form",
        message=(
            "Personal injury firm in Charlotte. Our intake is handled by a paralegal who is "
            "already at capacity and I suspect we're losing signed cases because of it."
        ),
        score=79,
        urgency="high",
        intent="Losing signed PI cases to an over-capacity intake paralegal",
        status="contacted",
        created_at=20,
        next_action_at=22,
        touches=[
            ("instant_reply", "email",
             "If intake sits with one person at capacity, you're almost certainly losing "
             "signed cases — in PI the loss is concentrated in the first hour after the "
             "enquiry, which is exactly when a busy paralegal can't get to the phone. That's "
             "measurable, and I'd start by measuring it.", 20),
        ],
    ),
    dict(
        name="Brian Osei",
        email="bosei@redstoneconstruction.com",
        phone="(816) 555-0149",
        company="Redstone Construction",
        city="Kansas City, MO",
        source="lead_ad",
        campaign_id=CONTRACTORS,
        message=(
            "Commercial GC doing about $40M a year. We only bid work that comes to us and I "
            "want to change that."
        ),
        score=71,
        urgency="medium",
        intent="$40M commercial GC wants to source bids proactively",
        status="follow_up_1",
        created_at=18,
        next_action_at=22,
        touches=[
            ("instant_reply", "email",
             "Bidding only inbound work at $40M means your growth is capped by whoever happens "
             "to think of you. Changing that is less about marketing than about knowing which "
             "projects are being scoped six months out. Worth a conversation.", 18),
            ("follow_up_1", "email",
             "Something concrete you can use either way: most commercial GCs who start "
             "sourcing their own bids find the highest-value signal in permit filings rather "
             "than bid boards — by the time it hits a bid board, the relationship is usually "
             "already decided.", 19),
        ],
    ),
    dict(
        name="Lauren Fitzgerald",
        email="lauren@willowcreekvet.com",
        phone="(615) 555-0172",
        company="Willow Creek Veterinary",
        city="Nashville, TN",
        source="missed_call",
        message=(
            "Missed call from (615) 555-0172. Voicemail: two-doctor veterinary practice, "
            "wants more new clients, mentioned a competitor opened nearby."
        ),
        score=66,
        urgency="medium",
        intent="Two-doctor vet practice facing a new nearby competitor",
        status="contacted",
        created_at=20,
        next_action_at=23,
        touches=[
            ("instant_reply", "email",
             "Sorry we missed your call. A new competitor nearby usually costs you far fewer "
             "existing clients than you'd fear and far more prospective ones than you'd "
             "expect — the fix is mostly about being the obvious first search result. Happy "
             "to explain what that takes.", 20),
        ],
    ),
    dict(
        # Just landed. The owner has been alerted and has not decided yet. If nobody
        # answers, the next scheduler pass hands him to the AI (2-hour SLA).
        name="Nathan Cole",
        email="ncole@colecommercialinteriors.com",
        phone="(503) 555-0163",
        company="Cole Commercial Interiors",
        city="Portland, OR",
        source="website_form",
        message=(
            "We fit out offices and medical suites across the Portland metro. Two of our "
            "three project managers are leaving in November and I need the pipeline full "
            "before I replace them, not after. Who do I talk to?"
        ),
        score=86,
        urgency="high",
        intent="Needs pipeline filled before replacing two departing project managers",
        status="new",
        created_at=20,
        next_action_at=21,
        # Fixed rather than random so the demo is reproducible after a re-seed.
        claim_token="demo-nathan-cole",
        touches=[
            ("instant_reply", "email",
             "Thanks for getting in touch. Wanting the pipeline full before you rehire is the "
             "right order — hiring into an empty pipeline is how project managers end up "
             "quitting again. I'd like to understand your November timeline properly.", 20),
            ("owner_alert", "email",
             "New lead: Nathan Cole (Cole Commercial Interiors) — score 86, high urgency.\n"
             "Needs pipeline filled before replacing two departing project managers.\n"
             "Awaiting your decision: take it yourself, or let the AI handle it.\n"
             "If nobody responds within 2 hours, the AI picks it up automatically.", 20),
        ],
    ),
    dict(
        # A human took this one and worked it. The AI cannot see it.
        name="Rebecca Lang",
        email="rlang@langassociatescpa.com",
        phone="(617) 555-0138",
        company="Lang & Associates CPA",
        city="Boston, MA",
        source="email_inquiry",
        message=(
            "Mid-size accounting practice, 14 staff. We want to move upmarket from individual "
            "returns into business advisory work but our enquiries are all the wrong kind."
        ),
        score=77,
        urgency="medium",
        intent="Wants to move upmarket from tax returns into business advisory",
        status="claimed",
        created_at=18,
        next_action_at=None,
        touches=[
            ("instant_reply", "email",
             "Moving a practice upmarket is usually a positioning problem before it's a "
             "marketing one — the enquiries you get are the enquiries you look like you want. "
             "That's fixable, and worth doing before you spend anything on ads.", 18),
            ("owner_alert", "email",
             "New lead: Rebecca Lang (Lang & Associates CPA) — score 77, medium urgency.\n"
             "Wants to move upmarket from tax returns into business advisory.\n"
             "Awaiting your decision: take it yourself, or let the AI handle it.", 18),
            ("event", "system",
             "Jordan Ellis claimed this lead. AI follow-ups paused.", 18),
            ("note", "system",
             "Jordan Ellis: Called Rebecca for 20 minutes. They turn away advisory work today "
             "because nobody on staff can scope it. Real blocker is capability, not leads. "
             "She's sending me their last six proposals. Following up Thursday.", 19),
        ],
    ),
    dict(
        # Terminal state (booked). Gives the Dental campaign a real outcome, so the
        # campaigns page can show cost per booked call rather than only cost per lead.
        name="Alan Whitcomb",
        email="awhitcomb@summitfamilydental.com",
        phone="(512) 555-0194",
        company="Summit Family Dentistry",
        city="Round Rock, TX",
        source="lead_ad",
        campaign_id=DENTAL,
        message=(
            "Single location, two hygienists, and we just took on an associate we need to keep "
            "busy. Saw your ad. What does it take to fill a new associate's chair?"
        ),
        score=84,
        urgency="high",
        intent="Needs to fill a newly hired associate dentist's chair",
        status="booked",
        created_at=6,
        next_action_at=None,
        replied_at=8,
        touches=[
            ("instant_reply", "email",
             "Filling a new associate's chair is a different problem from general growth — you "
             "need appointments in a specific diary, quickly, or the hire stops paying for "
             "itself. That's a solvable and quite measurable thing.", 6),
            ("follow_up_1", "email",
             "One thing worth knowing: practices that fill an associate's chair fastest almost "
             "always do it from their own inactive-patient list before spending on new "
             "patients. Cheaper, and those people already trust you.", 7),
            ("inbound_reply", "email",
             "The inactive list point landed. Let's talk — Tuesday or Wednesday afternoon?", 8),
            ("hot_alert", "system",
             "HOT LEAD: Alan Whitcomb (Summit Family Dentistry) replied on day 8. Sequence paused.", 8),
        ],
    ),
    dict(
        # Terminal state (cold). The Med-Spa campaign's only lead, and she never engaged —
        # which is exactly why that campaign is paused.
        name="Corinne Nash",
        email="corinne@lumenmedspa.com",
        phone="(480) 555-0117",
        company="Lumen Med Spa",
        city="Scottsdale, AZ",
        source="lead_ad",
        campaign_id=MEDSPA,
        message="Just opened. Curious about pricing.",
        score=31,
        urgency="low",
        intent="Price curiosity from a newly opened med spa",
        status="cold",
        created_at=0,
        next_action_at=None,
        touches=[
            ("instant_reply", "email",
             "Congratulations on opening. Pricing depends mostly on whether you need bookings "
             "this month or a foundation for the next year — those are different engagements. "
             "Which is it?", 0),
            ("follow_up_1", "email",
             "A new med spa's first ninety days are usually won on local search and reviews "
             "rather than on ads. Worth getting that right before spending anything.", 1),
            ("follow_up_2", "email",
             "Checking back. If the timing isn't right while you're still opening up, that's "
             "completely understandable — happy to try you later in the year.", 4),
            ("follow_up_3", "email",
             "This'll be my last note so I'm not cluttering your inbox. If you decide to push "
             "on growth once the doors have settled, I'm easy to find.", 11),
        ],
    ),
]


def insert_lead(conn, lead: dict) -> int:
    cur = conn.execute(
        """
        INSERT INTO leads (
            name, email, phone, company, city, source, message,
            score, urgency, intent, status, next_action_at, replied_at, opted_out,
            claim_token, campaign_id, fallback_1, fallback_2, fallback_3, created_at
        ) VALUES (
            :name, :email, :phone, :company, :city, :source, :message,
            :score, :urgency, :intent, :status, :next_action_at, :replied_at, :opted_out,
            :claim_token, :campaign_id, :fallback_1, :fallback_2, :fallback_3, :created_at
        )
        """,
        {
            **lead,
            "replied_at": lead.get("replied_at"),
            "opted_out": lead.get("opted_out", 0),
            "claim_token": lead.get("claim_token"),
            "campaign_id": lead.get("campaign_id"),
            "fallback_1": fallback_message(lead["name"], lead["company"], 1),
            "fallback_2": fallback_message(lead["name"], lead["company"], 2),
            "fallback_3": fallback_message(lead["name"], lead["company"], 3),
        },
    )
    return cur.lastrowid


# Only messages WE send wear the approved envelope. A lead's own reply is their
# words, and a system alert is raw text -- neither gets signed by Jordan Ellis.
OUTBOUND = {"instant_reply", "follow_up_1", "follow_up_2", "follow_up_3"}


def insert_touch(conn, lead_id: int, name: str, kind: str, channel: str, body: str, day: int) -> None:
    rendered = envelope(name, body) if kind in OUTBOUND else body
    conn.execute(
        """
        INSERT INTO touches (lead_id, kind, channel, body, day, was_real_send)
        VALUES (?, ?, ?, ?, ?, 0)
        """,
        (lead_id, kind, channel, rendered, day),
    )


def main() -> None:
    init_db()
    conn = get_conn()
    try:
        conn.execute("INSERT INTO demo_clock (id, current_day) VALUES (1, ?)", (START_DAY,))

        # Default engine config. These exactly reproduce the original hardcoded behaviour
        # (gap 1/3/7, 2-hour SLA, the approved step intents), so the demo cascade is unchanged
        # until the owner edits Settings.
        conn.execute(
            """INSERT INTO settings (id, sla_hours, gap_1, gap_2, gap_3, intent_1, intent_2, intent_3)
               VALUES (1, 2, 1, 3, 7, ?, ?, ?)""",
            (STEP_INTENT[1], STEP_INTENT[2], STEP_INTENT[3]),
        )

        # Campaigns first: leads.campaign_id references them, and the DENTAL/GYM/…
        # constants above assume they land as ids 1..4 in this order.
        for c in CAMPAIGNS:
            conn.execute(
                """INSERT INTO campaigns
                   (name, platform, status, daily_budget, spend, impressions, clicks, started_day)
                   VALUES (:name, :platform, :status, :daily_budget, :spend,
                           :impressions, :clicks, :started_day)""",
                c,
            )

        for lead in LEADS:
            touches = lead.pop("touches")
            lead_id = insert_lead(conn, lead)
            for kind, channel, body, day in touches:
                insert_touch(conn, lead_id, lead["name"], kind, channel, body, day)
        conn.commit()
    finally:
        conn.close()

    print(f"Seeded {len(CAMPAIGNS)} campaigns and {len(LEADS)} leads. Demo clock at day {START_DAY}.")


if __name__ == "__main__":
    main()
