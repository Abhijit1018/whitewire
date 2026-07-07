"use client";

import { useWorkspaceStore } from "@/core/state/workspace-store";
import { type ShapeStyle } from "@/core/canvas/style";
import { cn } from "@/lib/utils";

const STROKES = ["#1e1e1e", "#e03131", "#2f9e44", "#1971c2", "#f08c00"];
const FILLS = ["transparent", "#ffc9c9", "#b2f2bb", "#a5d8ff", "#ffec99"];
const WIDTHS: ShapeStyle["strokeWidth"][] = [1, 2, 4];
const STROKE_STYLES: ShapeStyle["strokeStyle"][] = ["solid", "dashed", "dotted"];
const SLOPPINESS: ShapeStyle["sloppiness"][] = [0, 1, 2];
const EDGES: ShapeStyle["edges"][] = ["sharp", "round"];

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Swatch({ color, active, onClick }: { color: string; active: boolean; onClick: () => void }) {
  const transparent = color === "transparent";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "size-6 rounded-md border transition-transform active:scale-95",
        active ? "ring-2 ring-brand-accent ring-offset-1" : "border-border",
      )}
      style={transparent ? { backgroundImage: "linear-gradient(45deg,#ddd 25%,transparent 25%,transparent 75%,#ddd 75%),linear-gradient(45deg,#ddd 25%,#fff 25%,#fff 75%,#ddd 75%)", backgroundSize: "8px 8px", backgroundPosition: "0 0,4px 4px" } : { background: color }}
    />
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-w-[2rem] rounded-md border px-2 py-1 text-[11px] capitalize transition-colors",
        active ? "border-brand-accent bg-brand-accent/12 text-brand-accent" : "border-border text-muted-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
}

export function StylePanel() {
  const activeTool = useWorkspaceStore((s) => s.activeTool);
  const toolDefaults = useWorkspaceStore((s) => s.toolDefaults);
  const nodes = useWorkspaceStore((s) => s.nodes);
  const setToolDefaults = useWorkspaceStore((s) => s.setToolDefaults);
  const applyStyleToSelection = useWorkspaceStore((s) => s.applyStyleToSelection);

  const selected = nodes.filter((n) => n.selected);
  const hasSelection = selected.length > 0;
  const creating = activeTool !== "select" && activeTool !== "hand";
  if (!hasSelection && !creating) return null;

  const current: ShapeStyle = { ...toolDefaults, ...(selected[0]?.data.style ?? {}) };
  const set = (patch: Partial<ShapeStyle>) =>
    hasSelection ? applyStyleToSelection(patch) : setToolDefaults(patch);

  return (
    <div className="absolute left-3 top-3 z-20 w-52">
      <div className="space-y-3 rounded-2xl border border-border bg-card/95 p-3 shadow-sm backdrop-blur">
        <Section label="Stroke">
          {STROKES.map((c) => (
            <Swatch key={c} color={c} active={current.stroke === c} onClick={() => set({ stroke: c })} />
          ))}
        </Section>
        <Section label="Background">
          {FILLS.map((c) => (
            <Swatch key={c} color={c} active={current.fill === c} onClick={() => set({ fill: c })} />
          ))}
        </Section>
        <Section label="Stroke width">
          {WIDTHS.map((w) => (
            <Chip key={w} label={`${w}px`} active={current.strokeWidth === w} onClick={() => set({ strokeWidth: w })} />
          ))}
        </Section>
        <Section label="Stroke style">
          {STROKE_STYLES.map((s) => (
            <Chip key={s} label={s} active={current.strokeStyle === s} onClick={() => set({ strokeStyle: s })} />
          ))}
        </Section>
        <Section label="Sloppiness">
          {SLOPPINESS.map((s) => (
            <Chip key={s} label={["clean", "rough", "wild"][s]} active={current.sloppiness === s} onClick={() => set({ sloppiness: s })} />
          ))}
        </Section>
        <Section label="Edges">
          {EDGES.map((e) => (
            <Chip key={e} label={e} active={current.edges === e} onClick={() => set({ edges: e })} />
          ))}
        </Section>
        <Section label="Opacity">
          <input
            type="range" min={0} max={100} value={Math.round(current.opacity * 100)}
            onChange={(e) => set({ opacity: Number(e.target.value) / 100 })}
            className="w-full"
          />
        </Section>
      </div>
    </div>
  );
}
