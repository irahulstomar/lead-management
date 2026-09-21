import { Sidebar } from "./Sidebar";
import { TONE_CLASS, type ChipTone } from "@/lib/status";

/** The shell every non-pipeline page shares: sidebar + a centered scroll column with a
 *  kicker/title/subtitle header. Matches the Playbook layout so the app reads as one app. */
export function Page({
  kicker,
  title,
  subtitle,
  actions,
  wide,
  children,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="scroll-quiet flex-1 overflow-y-auto bg-canvas">
        <div className={`mx-auto ${wide ? "max-w-[1080px]" : "max-w-[840px]"} px-8 py-12`}>
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <p className="text-[11px] font-medium tracking-wider text-muted uppercase">{kicker}</p>
              <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-ink">{title}</h1>
              {subtitle && (
                <p className="mt-3 max-w-[640px] text-[14px] leading-relaxed text-muted">{subtitle}</p>
              )}
            </div>
            {actions && <div className="shrink-0">{actions}</div>}
          </div>
          <div className="mt-10">{children}</div>
        </div>
      </main>
    </div>
  );
}

/** A read-only card. Unlike the lead-detail Card, it carries no edit affordance. */
export function Panel({
  title,
  right,
  children,
  bodyClass = "px-5 py-4",
}: {
  title?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  bodyClass?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-well">
      {title && (
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
          {right}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </div>
  );
}

export function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-well px-4 py-3.5">
      <p className="text-[11px] font-medium text-muted">{label}</p>
      <p className="tnum mt-1 text-[24px] leading-none font-semibold text-ink">{value}</p>
      {sub && <p className="mt-1.5 text-[11px] text-muted">{sub}</p>}
    </div>
  );
}

export function Chip({
  tone,
  icon: Icon,
  children,
}: {
  tone: ChipTone;
  icon?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${TONE_CLASS[tone]}`}
    >
      {Icon && <Icon size={10} />}
      {children}
    </span>
  );
}

/** A labelled horizontal bar. `frac` is 0..1; the caller decides what full means. */
export function Bar({
  label,
  value,
  frac,
  color = "var(--blue)",
  hint,
}: {
  label: string;
  value: string | number;
  frac: number;
  color?: string;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[12px] text-ink">{label}</span>
        <span className="tnum text-[12px] font-medium text-ink">
          {value}
          {hint && <span className="ml-1.5 font-normal text-muted">{hint}</span>}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-active">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(frac * 100, value === 0 ? 0 : 2)}%`, background: color }}
        />
      </div>
    </div>
  );
}
