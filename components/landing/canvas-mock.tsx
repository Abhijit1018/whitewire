import {
  MousePointer2,
  StickyNote,
  Type,
  Square,
  Minus,
  ArrowUpRight,
  Pencil,
  Frame,
  Image as ImageIcon,
  Upload,
  MoreHorizontal,
  Hand,
  Undo2,
  Redo2,
  Star,
  Share2,
  Search,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TOOLS = [MousePointer2, StickyNote, Type, Square, Minus, ArrowUpRight, Pencil, Frame, ImageIcon, Upload];

function Avatar({ i }: { i: number }) {
  const tints = ["oklch(0.62 0.14 44)", "oklch(0.55 0.09 155)", "oklch(0.5 0.1 250)"];
  return (
    <span
      className="grid size-6 place-items-center rounded-full border-2 border-card text-[10px] font-semibold text-white"
      style={{ backgroundColor: tints[i % tints.length] }}
    >
      {["A", "R", "M"][i % 3]}
    </span>
  );
}

/**
 * A static, hand-crafted preview of the WhiteWire canvas — a real-looking
 * product shot, not a generic dashboard. Decorative only.
 */
export function CanvasMock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-black/10 bg-card shadow-2xl shadow-black/10 ring-1 ring-black/5",
        className,
      )}
      aria-hidden
    >
      {/* top bar */}
      <div className="flex items-center gap-2 border-b border-border/70 bg-card px-3 py-2">
        <span className="grid size-6 place-items-center rounded-md bg-brand-accent/12 text-brand-accent">
          <svg viewBox="0 0 48 48" className="size-4" fill="none">
            <path d="M13 16 L18 32 L24 20 L30 32 L35 16" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="text-sm font-semibold">WhiteWire</span>
        <span className="mx-1 text-border">/</span>
        <span className="rounded-md px-1.5 py-0.5 text-sm text-muted-foreground">Product Roadmap ▾</span>
        <div className="ml-auto flex items-center gap-2">
          <Search className="size-4 text-muted-foreground" />
          <span className="flex -space-x-1.5">
            {[0, 1, 2].map((i) => (
              <Avatar key={i} i={i} />
            ))}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-brand-accent px-2 py-1 text-xs font-medium text-white">
            <Share2 className="size-3" /> Share
          </span>
          <MessageSquare className="size-4 text-muted-foreground" />
          <MoreHorizontal className="size-4 text-muted-foreground" />
        </div>
      </div>

      <div className="flex">
        {/* left tool rail */}
        <div className="flex flex-col items-center gap-1 border-r border-border/70 bg-card px-1.5 py-2">
          {TOOLS.map((Icon, i) => (
            <span
              key={i}
              className={cn(
                "grid size-7 place-items-center rounded-lg text-muted-foreground",
                i === 0 && "bg-brand-accent/12 text-brand-accent",
              )}
            >
              <Icon className="size-4" />
            </span>
          ))}
          <MoreHorizontal className="size-4 text-muted-foreground/60" />
        </div>

        {/* board */}
        <div
          className="relative min-h-[400px] flex-1 overflow-hidden"
          style={{
            backgroundColor: "oklch(0.985 0.006 74)",
            backgroundImage: "radial-gradient(oklch(0.86 0.006 65) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        >
          {/* handwritten title */}
          <div className="absolute left-6 top-5">
            <span className="font-hand text-2xl text-foreground">Product Roadmap</span>
            <div className="mt-0.5 h-1 w-40 rounded-full bg-brand-accent/50" />
          </div>

          {/* Goals — dashed sticky, top-right, clear of the flow below */}
          <div className="absolute right-4 top-5 w-32 rounded-lg border border-dashed border-brand-accent/50 bg-brand-accent/5 p-2.5">
            <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-foreground">
              Goals <Star className="size-3 fill-brand-accent text-brand-accent" />
            </p>
            {["Ship MVP", "Validate early", "Iterate fast"].map((g) => (
              <p key={g} className="text-[10px] text-muted-foreground">• {g}</p>
            ))}
          </div>

          {/* flow row — below the title/Goals band */}
          <div className="absolute left-6 top-[136px] flex items-center gap-1.5">
            {["Discover", "Define", "Design", "Deliver"].map((s, i) => (
              <div key={s} className="flex items-center gap-1.5">
                <div className="rounded-md border border-border bg-card px-2.5 py-1.5 text-center shadow-sm">
                  <p className="text-[10px] font-medium text-foreground">{s}</p>
                </div>
                {i < 3 && <span className="text-xs text-muted-foreground">→</span>}
              </div>
            ))}
          </div>

          {/* Rohan cursor — right-center gap, below the flow */}
          <span className="absolute right-[12%] top-[212px] flex items-center gap-1">
            <MousePointer2 className="size-4" style={{ fill: "oklch(0.55 0.09 155)", color: "oklch(0.55 0.09 155)" }} />
            <span className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white" style={{ backgroundColor: "oklch(0.55 0.09 155)" }}>Rohan</span>
          </span>

          {/* Next steps — peach note, bottom-left, above the toolbar */}
          <div className="absolute bottom-16 left-6 w-40 -rotate-1 rounded-md bg-[oklch(0.9_0.05_55)] p-2.5 shadow-md">
            <p className="mb-1 font-hand text-base text-[oklch(0.35_0.08_45)]">Next Steps</p>
            {[["User interviews", false], ["Wireframes", true], ["Technical spike", false]].map(([t, done]) => (
              <p key={t as string} className="flex items-center gap-1.5 text-[10px] text-[oklch(0.4_0.06_45)]">
                <span className={cn("grid size-3 place-items-center rounded-full border", done ? "border-brand-accent bg-brand-accent text-white" : "border-current")}>
                  {done ? "✓" : ""}
                </span>
                {t}
              </p>
            ))}
          </div>

          {/* Aanya cursor — right side, clear of notes */}
          <span className="absolute right-[38%] top-[250px] flex items-center gap-1">
            <MousePointer2 className="size-4 fill-brand-accent text-brand-accent" />
            <span className="rounded bg-brand-accent px-1.5 py-0.5 text-[10px] font-medium text-white">Aanya</span>
          </span>

          {/* bottom toolbar */}
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-border bg-card/95 px-2 py-1.5 shadow-md backdrop-blur">
            {[MousePointer2, Hand, Pencil, Square, Type, StickyNote, Frame].map((Icon, i) => (
              <span key={i} className="grid size-6 place-items-center rounded-md text-muted-foreground">
                <Icon className="size-3.5" />
              </span>
            ))}
            <span className="mx-0.5 h-4 w-px bg-border" />
            <Undo2 className="size-3.5 text-muted-foreground" />
            <Redo2 className="size-3.5 text-muted-foreground" />
          </div>

          {/* minimap */}
          <div className="absolute bottom-3 right-3 hidden h-14 w-24 rounded-md border border-border bg-card/80 sm:block">
            <div className="m-2 h-3 w-8 rounded-sm bg-brand-accent/20" />
            <div className="mx-2 h-2 w-14 rounded-sm bg-border" />
          </div>
        </div>

        {/* right properties panel */}
        <div className="hidden w-40 shrink-0 flex-col gap-3 border-l border-border/70 bg-card px-3 py-3 lg:flex">
          <p className="text-xs font-semibold text-foreground">Canvas</p>
          <div className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5">
            <span className="size-3 rounded bg-[oklch(0.9_0.04_60)]" />
            <span className="text-[11px] text-muted-foreground"># FAF7F2</span>
          </div>
          <div>
            <p className="mb-1 text-[11px] text-muted-foreground">Paper</p>
            <div className="flex gap-1.5">
              <span className="h-8 flex-1 rounded border border-border bg-card" />
              <span className="h-8 flex-1 rounded border-2 border-brand-accent bg-card" />
              <span className="h-8 flex-1 rounded border border-border bg-card" />
            </div>
          </div>
          <div>
            <p className="mb-1 text-[11px] text-muted-foreground">Grid</p>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={cn("grid size-7 place-items-center rounded border text-muted-foreground", i === 1 ? "border-brand-accent" : "border-border")}>
                  <span className="text-[8px]">⋯</span>
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-[11px] text-muted-foreground">Export</p>
            <div className="flex gap-1.5">
              {["PNG", "SVG", "PDF"].map((f) => (
                <span key={f} className="flex-1 rounded border border-border py-1 text-center text-[9px] text-muted-foreground">{f}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
