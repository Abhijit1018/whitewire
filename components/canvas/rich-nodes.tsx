"use client";

import { useState } from "react";
import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react";
import { Database, Code2, Image as ImageIcon, Film, Link2 } from "lucide-react";
import { useWorkspaceStore, type AiNode as AiNodeType } from "@/core/state/workspace-store";

const handleClass = "!h-2.5 !w-2.5 !border-2 !border-white !bg-brand-accent";

function Resizer({ selected, minWidth, minHeight }: { selected: boolean; minWidth: number; minHeight: number }) {
  return (
    <NodeResizer
      minWidth={minWidth}
      minHeight={minHeight}
      isVisible={selected}
      lineClassName="!border-brand-accent"
      handleClassName="!h-2 !w-2 !rounded-sm !border-white !bg-brand-accent"
    />
  );
}

/**
 * Titled container. Children are real React Flow children (parentId + extent),
 * so dragging the group carries them along. Rendered as a backdrop, which is
 * why the body stays pointer-transparent.
 */
export function GroupNode({ data, selected }: NodeProps<AiNodeType>) {
  return (
    <div className="h-full w-full">
      <Resizer selected={!!selected} minWidth={200} minHeight={140} />
      <div
        className={`h-full w-full rounded-2xl border-2 border-dashed transition-colors ${
          selected ? "border-brand-accent bg-brand-accent/[0.04]" : "border-zinc-300 bg-zinc-500/[0.03]"
        }`}
      />
      <span className="pointer-events-none absolute left-3 top-2 rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-medium text-zinc-600 shadow-sm">
        {data.text || "Group"}
      </span>
      <Handle type="target" position={Position.Top} className={handleClass} />
      <Handle type="source" position={Position.Bottom} className={handleClass} />
    </div>
  );
}

const KEY_STYLES: Record<string, string> = {
  pk: "bg-amber-100 text-amber-700",
  fk: "bg-sky-100 text-sky-700",
};

/** A schema entity: name, columns, types, key markers — an ER box, not a paragraph. */
export function TableNode({ id, data, selected }: NodeProps<AiNodeType>) {
  const updateNodeData = useWorkspaceStore((s) => s.updateNodeData);
  const columns = data.table?.columns ?? [];

  function editColumn(index: number, patch: { name?: string; type?: string }) {
    const next = columns.map((c, i) => (i === index ? { ...c, ...patch } : c));
    updateNodeData(id, { table: { columns: next } });
  }

  function addColumn() {
    updateNodeData(id, { table: { columns: [...columns, { name: "column", type: "text" }] } });
  }
  return (
    <div
      className={`w-full overflow-hidden rounded-xl border bg-white shadow-sm ${
        selected ? "border-brand-accent ring-2 ring-brand-accent/30" : "border-zinc-200"
      }`}
    >
      <Resizer selected={!!selected} minWidth={200} minHeight={120} />
      <Handle type="target" position={Position.Top} className={handleClass} />
      <div className="flex items-center gap-1.5 border-b border-zinc-100 bg-zinc-50 px-3 py-1.5">
        <Database className="size-3.5 text-zinc-400" />
        <span className="text-[13px] font-semibold text-zinc-800">{data.text || "table"}</span>
      </div>
      <ul className="divide-y divide-zinc-50">
        {columns.map((c, i) => (
          <li key={i} className="flex items-center justify-between gap-2 px-3 py-1">
            <span className="flex min-w-0 flex-1 items-center gap-1.5">
              {c.key && (
                <span className={`rounded px-1 text-[9px] font-bold uppercase ${KEY_STYLES[c.key]}`}>{c.key}</span>
              )}
              <input
                value={c.name}
                onChange={(e) => editColumn(i, { name: e.target.value })}
                className="nodrag min-w-0 flex-1 bg-transparent text-[12px] text-zinc-700 outline-none focus:text-zinc-900"
                aria-label={`Column ${i + 1} name`}
              />
            </span>
            <input
              value={c.type}
              onChange={(e) => editColumn(i, { type: e.target.value })}
              className="nodrag w-20 shrink-0 bg-transparent text-right font-mono text-[10px] text-zinc-400 outline-none focus:text-zinc-700"
              aria-label={`Column ${i + 1} type`}
            />
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={addColumn}
        className="nodrag w-full border-t border-zinc-100 px-3 py-1 text-left text-[11px] text-zinc-400 transition-colors hover:bg-zinc-50 hover:text-zinc-600"
      >
        + column
      </button>
      <Handle type="source" position={Position.Bottom} className={handleClass} />
    </div>
  );
}

/** Monospace source block, editable in place. Plain text — no highlighter dependency. */
export function CodeNode({ id, data, selected }: NodeProps<AiNodeType>) {
  const updateNodeData = useWorkspaceStore((s) => s.updateNodeData);
  const language = data.code?.language ?? "text";
  return (
    <div
      className={`flex h-full w-full flex-col overflow-hidden rounded-xl border bg-zinc-950 shadow-sm ${
        selected ? "border-brand-accent ring-2 ring-brand-accent/30" : "border-zinc-800"
      }`}
    >
      <Resizer selected={!!selected} minWidth={220} minHeight={120} />
      <Handle type="target" position={Position.Top} className={handleClass} />
      <div className="flex items-center gap-1.5 border-b border-zinc-800 px-3 py-1.5">
        <Code2 className="size-3.5 text-zinc-500" />
        <span className="truncate text-[12px] font-medium text-zinc-300">{data.text || "snippet"}</span>
        <input
          value={language}
          onChange={(e) => updateNodeData(id, { code: { language: e.target.value, source: data.code?.source ?? "" } })}
          className="nodrag ml-auto w-16 shrink-0 rounded bg-zinc-800 px-1.5 py-0.5 text-right font-mono text-[9px] uppercase text-zinc-400 outline-none focus:text-zinc-200"
          aria-label="Language"
        />
      </div>
      <textarea
        value={data.code?.source ?? ""}
        onChange={(e) => updateNodeData(id, { code: { language, source: e.target.value } })}
        spellCheck={false}
        placeholder="// write or paste code…"
        className="nodrag nowheel flex-1 resize-none bg-transparent px-3 py-2 font-mono text-[11px] leading-relaxed text-zinc-200 outline-none placeholder:text-zinc-600"
      />
      <Handle type="source" position={Position.Bottom} className={handleClass} />
    </div>
  );
}

/** Editable URL field shown while a media node has no source yet. */
function UrlPrompt({ id, placeholder }: { id: string; placeholder: string }) {
  const updateNodeData = useWorkspaceStore((s) => s.updateNodeData);
  const [value, setValue] = useState("");
  return (
    <form
      className="flex h-full w-full flex-col items-center justify-center gap-2 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) updateNodeData(id, { media: { url: value.trim() } });
      }}
    >
      <Link2 className="size-5 text-zinc-300" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="nodrag w-full rounded-md border border-zinc-200 px-2 py-1 text-[11px] outline-none focus:border-brand-accent"
      />
    </form>
  );
}

function MediaFrame({
  selected,
  children,
  caption,
}: {
  selected: boolean;
  children: React.ReactNode;
  caption?: string;
}) {
  return (
    <div
      className={`flex h-full w-full flex-col overflow-hidden rounded-xl border bg-white shadow-sm ${
        selected ? "border-brand-accent ring-2 ring-brand-accent/30" : "border-zinc-200"
      }`}
    >
      <Handle type="target" position={Position.Top} className={handleClass} />
      <div className="flex-1 overflow-hidden bg-zinc-50">{children}</div>
      {caption ? (
        <p className="truncate border-t border-zinc-100 px-2.5 py-1 text-[11px] text-zinc-500">{caption}</p>
      ) : null}
      <Handle type="source" position={Position.Bottom} className={handleClass} />
    </div>
  );
}

export function ImageNode({ id, data, selected }: NodeProps<AiNodeType>) {
  const url = data.media?.url;
  return (
    <>
      <Resizer selected={!!selected} minWidth={140} minHeight={100} />
      <MediaFrame selected={!!selected} caption={data.media?.caption || data.text}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={data.media?.caption || data.text || "image"} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center">
            <ImageIcon className="size-5 text-zinc-300" />
            <UrlPrompt id={id} placeholder="Paste an image URL…" />
          </div>
        )}
      </MediaFrame>
    </>
  );
}

/**
 * Only YouTube and Vimeo are embedded as iframes; anything else is played with
 * a plain <video>. Embedding arbitrary origins in an iframe is not worth it.
 */
function embedUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtube.com" && url.searchParams.get("v")) {
      return `https://www.youtube-nocookie.com/embed/${url.searchParams.get("v")}`;
    }
    if (host === "youtu.be" && url.pathname.length > 1) {
      return `https://www.youtube-nocookie.com/embed${url.pathname}`;
    }
    if (host === "vimeo.com" && /^\/\d+$/.test(url.pathname)) {
      return `https://player.vimeo.com/video${url.pathname}`;
    }
    return null;
  } catch {
    return null;
  }
}

export function VideoNode({ id, data, selected }: NodeProps<AiNodeType>) {
  const url = data.media?.url;
  const embed = url ? embedUrl(url) : null;
  return (
    <>
      <Resizer selected={!!selected} minWidth={200} minHeight={140} />
      <MediaFrame selected={!!selected} caption={data.media?.caption || data.text}>
        {!url ? (
          <div className="flex h-full w-full flex-col items-center justify-center">
            <Film className="size-5 text-zinc-300" />
            <UrlPrompt id={id} placeholder="Paste a video URL…" />
          </div>
        ) : embed ? (
          <iframe
            src={embed}
            title={data.text || "video"}
            className="h-full w-full"
            allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video src={url} controls className="h-full w-full object-contain" />
        )}
      </MediaFrame>
    </>
  );
}
