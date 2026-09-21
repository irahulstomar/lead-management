import { Sidebar } from "@/components/Sidebar";
import { ShieldCheck, Clock, Bot, Hand, Flame, Ban } from "lucide-react";

const STEPS = [
  {
    n: "01",
    title: "A lead arrives",
    body: "From the website form, a Facebook or Instagram lead ad, a missed call, or an email enquiry. Everything lands in one place. Nothing sits in an inbox.",
  },
  {
    n: "02",
    title: "Gemini qualifies it, in seconds",
    body: "Score out of 100, urgency, and a one-line read on what they actually want — grounded only in what the lead wrote. The model never invents a fact about them, and an instruction hidden in their message is treated as a low-quality signal, not an order.",
  },
  {
    n: "03",
    title: "They get an answer immediately",
    body: "A personalised acknowledgement goes out while they still have our page open. Speed-to-lead is the whole edge: the first hour matters more than the month that follows it.",
  },
  {
    n: "04",
    title: "A human gets first refusal — 2-hour SLA",
    body: "The owner is alerted with the qualification and the lead's own words, and two choices: take it, or hand it to the AI. Real relationships start with a person. The machine is the safety net, not the front line.",
  },
  {
    n: "05",
    title: "If nobody answers, the AI picks it up",
    body: "Two hours of silence and the follow-up sequence engages automatically — and the timeline records that it did, and why. A forgotten lead is worse than an automated one.",
  },
  {
    n: "06",
    title: "The sequence: day 1, day 3, day 7",
    body: "Value-add, then a gentle nudge, then a polite breakup. Every message is drafted inside an approved template — Gemini writes the middle, never the greeting, never the sign-off, never a claim we can't stand behind.",
  },
  {
    n: "07",
    title: "A reply stops everything, instantly",
    body: "The sequence pauses the moment they answer, and a 🔥 hot-lead alert goes to the owner. Nobody wants a robot chasing someone who already replied.",
  },
];

const RULES = [
  {
    icon: Ban,
    title: "A lead who replied or opted out is never messaged again",
    body: "This is enforced by the database query that selects who is due — not by a prompt, and not by an if-statement at send time. Such a lead is not skipped; they are never selected in the first place. It is structurally impossible.",
  },
  {
    icon: Hand,
    title: "A human-owned lead is invisible to the AI",
    body: "The moment someone claims a lead, it leaves the sender's reach by exactly the same mechanism. The machine cannot talk over a colleague.",
  },
  {
    icon: Bot,
    title: "The AI sequences. It never converses.",
    body: "It drafts scheduled messages inside templates we approved. It does not answer inbound mail, negotiate, quote a price, or book a meeting. A person does that.",
  },
  {
    icon: Clock,
    title: "Every claimed lead gets its notes written up",
    body: "What was discussed, what they actually need. A conversation nobody wrote down did not happen.",
  },
];

export default function Playbook() {
  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="scroll-quiet flex-1 overflow-y-auto bg-canvas">
        <div className="mx-auto max-w-[720px] px-8 py-12">
          <p className="text-[11px] font-medium tracking-wider text-muted uppercase">
            Northbeam Partners
          </p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-ink">
            How we handle a lead
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-muted">
            Our standard operating procedure, start to finish. Written down because a process
            that lives in someone&rsquo;s head is a process that stops when they go on holiday.
          </p>

          <ol className="mt-10 space-y-0">
            {STEPS.map((s, i) => (
              <li key={s.n} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <span className="tnum grid size-8 shrink-0 place-items-center rounded-full border border-line-strong bg-panel text-[11px] font-medium text-muted">
                    {s.n}
                  </span>
                  {i < STEPS.length - 1 && <span className="w-px flex-1 bg-line" />}
                </div>
                <div className="pb-8">
                  <h2 className="text-[15px] font-semibold text-ink">{s.title}</h2>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-4 flex items-center gap-2">
            <ShieldCheck size={16} className="text-ink" />
            <h2 className="text-[15px] font-semibold text-ink">Rules we do not break</h2>
          </div>
          <p className="mt-1.5 text-[13px] text-muted">
            These are not guidelines. Three of the four are enforced by the system itself.
          </p>

          <div className="mt-5 space-y-3">
            {RULES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-line bg-panel p-5">
                <div className="flex items-center gap-2.5">
                  <Icon size={15} className="shrink-0 text-ink" />
                  <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{body}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-start gap-3 rounded-xl border border-ember/20 bg-ember/[0.03] p-5">
            <Flame size={15} className="mt-0.5 shrink-0 text-ember" />
            <div>
              <h3 className="text-[13px] font-semibold text-ink">When a lead replies</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                Drop what you are doing. The sequence has already stopped itself; the only
                thing left is for a person to answer, and the odds decay by the hour.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
