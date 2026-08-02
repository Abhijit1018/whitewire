"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildMemoryGraph, backlinksFor, extractLinks } from "@/core/memory/links";
import { saveNoteAction, deleteNoteAction } from "./actions";

export type Note = { id: string; title: string; body: string; harvested?: boolean };

/** Radial map of the notes and the [[links]] between them. */
function GraphView({
  notes,
  activeId,
  onPick,
}: {
  notes: Note[];
  activeId: string | null;
  onPick: (title: string) => void;
}) {
  const graph = useMemo(() => buildMemoryGraph(notes), [notes]);
  const size = 460;
  const radius = size / 2 - 60;
  const positions = new Map(
    graph.nodes.map((n, i) => {
      const angle = (i / Math.max(graph.nodes.length, 1)) * Math.PI * 2 - Math.PI / 2;
      return [n.id, { x: size / 2 + Math.cos(angle) * radius, y: size / 2 + Math.sin(angle) * radius }];
    }),
  );

  if (graph.nodes.length === 0) {
    return <p className="p-6 text-sm text-muted-foreground">No notes yet — the graph fills in as you write.</p>;
  }

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-auto w-full">
      {graph.links.map((link, i) => {
        const a = positions.get(link.from);
        const b = positions.get(link.to);
        if (!a || !b) return null;
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="currentColor" className="text-border" strokeWidth={1} />;
      })}
      {graph.nodes.map((node) => {
        const p = positions.get(node.id)!;
        return (
          <g key={node.id} onClick={() => onPick(node.title)} className="cursor-pointer">
            <circle
              cx={p.x}
              cy={p.y}
              r={node.id === activeId ? 9 : 6}
              className={
                !node.exists
                  ? "fill-transparent stroke-muted-foreground"
                  : node.id === activeId
                    ? "fill-brand-accent"
                    : "fill-muted-foreground"
              }
              strokeDasharray={node.exists ? undefined : "2 2"}
            />
            <text x={p.x} y={p.y - 12} textAnchor="middle" className="fill-foreground text-[9px]">
              {node.title.slice(0, 18)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function MemoryWorkbench({ notes }: { notes: Note[] }) {
  const [activeId, setActiveId] = useState<string | null>(notes[0]?.id ?? null);
  const [draftTitle, setDraftTitle] = useState("");

  const active = notes.find((n) => n.id === activeId) ?? null;
  const graph = useMemo(() => buildMemoryGraph(notes), [notes]);
  const backlinks = active
    ? backlinksFor(active.id, graph)
        .map((id) => notes.find((n) => n.id === id))
        .filter((n): n is Note => Boolean(n))
    : [];
  const outgoing = active ? extractLinks(active.body) : [];

  /** Clicking a graph node or a link jumps to that note, if it exists. */
  function open(title: string) {
    const found = notes.find((n) => n.title.toLowerCase() === title.toLowerCase());
    if (found) setActiveId(found.id);
    else setDraftTitle(title);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr_320px]">
      <aside className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</h2>
        <ul className="space-y-1">
          {notes.map((note) => (
            <li key={note.id}>
              <button
                type="button"
                onClick={() => setActiveId(note.id)}
                className={`flex w-full items-center gap-1.5 truncate rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                  note.id === activeId ? "bg-brand-accent/10 text-brand-accent" : "hover:bg-muted"
                }`}
              >
                <span className="truncate">{note.title}</span>
                {note.harvested && (
                  <span
                    title="From your boards"
                    className="ml-auto shrink-0 rounded bg-muted px-1 text-[9px] uppercase text-muted-foreground"
                  >
                    board
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => {
            setActiveId(null);
            setDraftTitle("");
          }}
          className="w-full rounded-md border border-dashed border-border px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
        >
          + New note
        </button>
      </aside>

      <section>
        <form action={saveNoteAction} className="space-y-3">
          <input type="hidden" name="id" value={active && !active.harvested ? active.id : ""} />
          <Input
            name="title"
            key={`${active?.id ?? "new"}-title`}
            defaultValue={active?.title ?? draftTitle}
            placeholder="Note title"
            required
            className="h-10 text-base font-medium"
          />
          <textarea
            name="body"
            key={`${active?.id ?? "new"}-body`}
            defaultValue={active?.body ?? ""}
            rows={16}
            placeholder="Write freely. Link another note with [[its title]]."
            className="w-full resize-y rounded-lg border border-border bg-transparent p-3 font-mono text-sm outline-none focus:border-brand-accent"
          />
          <div className="flex items-center gap-2">
            <Button type="submit">Save note</Button>
            {active && !active.harvested && (
              <Button type="submit" formAction={deleteNoteAction} variant="outline">
                <Trash2 className="size-4" /> Delete
              </Button>
            )}
          </div>
        </form>
      </section>

      <aside className="space-y-5">
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Graph</h2>
          <div className="rounded-lg border border-border">
            <GraphView notes={notes} activeId={activeId} onPick={open} />
          </div>
        </div>
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Links from this note
          </h2>
          {outgoing.length === 0 ? (
            <p className="text-sm text-muted-foreground">None. Use [[title]] to link.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {outgoing.map((title) => (
                <li key={title}>
                  <button type="button" onClick={() => open(title)} className="text-brand-accent hover:underline">
                    {title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Backlinks</h2>
          {backlinks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing links here yet.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {backlinks.map((note) => (
                <li key={note.id}>
                  <button type="button" onClick={() => setActiveId(note.id)} className="text-brand-accent hover:underline">
                    {note.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
