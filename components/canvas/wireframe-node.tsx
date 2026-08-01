"use client";

import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react";
import type { AiNode as AiNodeType } from "@/core/state/workspace-store";
import type { WireframeElement } from "@/core/ai/wireframe";

const handleClass = "!h-2.5 !w-2.5 !border-2 !border-white !bg-brand-accent";

/** Grey placeholder bar, the basic unit of a lo-fi wireframe. */
function Bar({ w = "100%", className = "" }: { w?: string; className?: string }) {
  return <span className={`block h-1 rounded-sm bg-zinc-300 ${className}`} style={{ width: w }} />;
}

function Dot({ className = "" }: { className?: string }) {
  return <span className={`block shrink-0 rounded-full bg-zinc-300 ${className}`} />;
}

function Repeat({ n, render }: { n: number; render: (i: number) => React.ReactNode }) {
  return <>{Array.from({ length: n }, (_, i) => render(i))}</>;
}

const FRAME = "border border-zinc-300 bg-white";

/**
 * Draws one wireframe primitive. Each type renders its own miniature structure
 * — a table shows rows and a header, a chart shows bars — so the screen reads
 * as a layout rather than a grid of labelled rectangles.
 */
function Element({ el }: { el: WireframeElement }) {
  const label = el.label;

  switch (el.type) {
    case "nav":
      return (
        <div className="flex h-full w-full items-center gap-1.5 bg-zinc-800 px-1.5">
          <span className="text-[7px] font-semibold text-white">{label || "logo"}</span>
          <span className="ml-auto flex items-center gap-1">
            <Repeat n={4} render={(i) => <Bar key={i} w="10px" className="bg-zinc-500" />} />
          </span>
        </div>
      );

    case "sidebar":
      return (
        <div className={`flex h-full w-full flex-col gap-1.5 p-1.5 ${FRAME} bg-zinc-50`}>
          {label ? <span className="text-[7px] font-medium text-zinc-500">{label}</span> : null}
          <Repeat n={5} render={(i) => <Bar key={i} w={i === 1 ? "80%" : "60%"} />} />
        </div>
      );

    case "header":
      return (
        <div className="flex h-full w-full flex-col justify-center gap-1">
          <span className="truncate text-[9px] font-semibold text-zinc-700">{label || "Heading"}</span>
          <Bar w="70%" />
        </div>
      );

    case "footer":
      return (
        <div className="flex h-full w-full items-center justify-center gap-2 border-t border-zinc-200 bg-zinc-50">
          <Repeat n={3} render={(i) => <Bar key={i} w="18px" />} />
        </div>
      );

    case "modal":
      return (
        <div className="flex h-full w-full flex-col gap-1 rounded border border-zinc-400 bg-white p-1.5 shadow-lg">
          <span className="text-[8px] font-semibold text-zinc-700">{label || "Dialog"}</span>
          <Bar w="90%" />
          <Bar w="75%" />
          <span className="mt-auto flex justify-end gap-1">
            <span className="h-2.5 w-6 rounded-sm bg-zinc-200" />
            <span className="h-2.5 w-6 rounded-sm bg-brand-accent" />
          </span>
        </div>
      );

    case "divider":
      return <div className="flex h-full w-full items-center"><span className="h-px w-full bg-zinc-300" /></div>;

    case "text":
      return (
        <div className="flex h-full w-full flex-col justify-center gap-1">
          <Bar w="100%" />
          <Bar w="92%" />
          <Bar w="60%" />
        </div>
      );

    case "image":
      return (
        <div className={`flex h-full w-full items-center justify-center ${FRAME} bg-zinc-100`}>
          <svg viewBox="0 0 24 16" className="h-1/2 w-1/2 text-zinc-300" fill="none" stroke="currentColor">
            <rect x="1" y="1" width="22" height="14" strokeWidth="1.5" />
            <circle cx="7" cy="6" r="2" strokeWidth="1.5" />
            <path d="M2 14l6-5 4 3 4-4 6 6" strokeWidth="1.5" />
          </svg>
        </div>
      );

    case "card":
      return (
        <div className={`flex h-full w-full flex-col gap-1 rounded p-1 ${FRAME}`}>
          <span className="h-1/2 w-full rounded-sm bg-zinc-100" />
          <span className="truncate text-[7px] font-medium text-zinc-600">{label || "Card"}</span>
          <Bar w="80%" />
        </div>
      );

    case "list":
      return (
        <div className={`flex h-full w-full flex-col divide-y divide-zinc-100 rounded ${FRAME}`}>
          <Repeat
            n={4}
            render={(i) => (
              <span key={i} className="flex flex-1 items-center gap-1 px-1.5">
                <Dot className="size-1.5" />
                <Bar w="70%" />
              </span>
            )}
          />
        </div>
      );

    case "table":
      return (
        <div className={`flex h-full w-full flex-col rounded ${FRAME}`}>
          <span className="flex items-center gap-1 border-b border-zinc-200 bg-zinc-100 px-1 py-0.5">
            <Repeat n={4} render={(i) => <Bar key={i} w="22%" className="bg-zinc-400" />} />
          </span>
          <Repeat
            n={4}
            render={(r) => (
              <span key={r} className="flex flex-1 items-center gap-1 border-b border-zinc-100 px-1">
                <Repeat n={4} render={(c) => <Bar key={c} w="22%" />} />
              </span>
            )}
          />
        </div>
      );

    case "chart":
      return (
        <div className={`flex h-full w-full items-end gap-1 rounded p-1 ${FRAME}`}>
          {[55, 80, 40, 95, 65, 75].map((h, i) => (
            <span key={i} className="flex-1 rounded-sm bg-zinc-300" style={{ height: `${h}%` }} />
          ))}
        </div>
      );

    case "button":
      return (
        <div className="flex h-full w-full items-center justify-center rounded bg-brand-accent px-1">
          <span className="truncate text-[8px] font-medium text-white">{label || "Button"}</span>
        </div>
      );

    case "input":
      return (
        <div className={`flex h-full w-full items-center rounded px-1.5 ${FRAME}`}>
          <span className="truncate text-[8px] text-zinc-400">{label || "Input"}</span>
        </div>
      );

    case "search":
      return (
        <div className={`flex h-full w-full items-center gap-1 rounded-full px-1.5 ${FRAME}`}>
          <svg viewBox="0 0 16 16" className="size-2 shrink-0 text-zinc-400" fill="none" stroke="currentColor">
            <circle cx="7" cy="7" r="5" strokeWidth="2" />
            <path d="M11 11l4 4" strokeWidth="2" />
          </svg>
          <span className="truncate text-[8px] text-zinc-400">{label || "Search"}</span>
        </div>
      );

    case "tabs":
      return (
        <div className="flex h-full w-full items-end gap-0.5">
          <Repeat
            n={3}
            render={(i) => (
              <span
                key={i}
                className={`flex flex-1 items-center justify-center rounded-t border-x border-t border-zinc-300 text-[7px] ${
                  i === 0 ? "bg-white font-medium text-zinc-700" : "bg-zinc-100 text-zinc-400"
                }`}
                style={{ height: "80%" }}
              >
                {i === 0 && label ? label : `Tab ${i + 1}`}
              </span>
            )}
          />
        </div>
      );

    case "checkbox":
      return (
        <div className="flex h-full w-full items-center gap-1">
          <span className="size-2 shrink-0 rounded-sm border border-zinc-400" />
          <span className="truncate text-[8px] text-zinc-500">{label || "Option"}</span>
        </div>
      );

    case "toggle":
      return (
        <div className="flex h-full w-full items-center gap-1">
          <span className="flex h-2.5 w-4 shrink-0 items-center rounded-full bg-brand-accent px-0.5">
            <span className="ml-auto size-1.5 rounded-full bg-white" />
          </span>
          <span className="truncate text-[8px] text-zinc-500">{label}</span>
        </div>
      );

    case "pagination":
      return (
        <div className="flex h-full w-full items-center justify-center gap-1">
          <Repeat
            n={5}
            render={(i) => (
              <span
                key={i}
                className={`flex size-3 items-center justify-center rounded border text-[6px] ${
                  i === 0 ? "border-brand-accent bg-brand-accent text-white" : "border-zinc-300 text-zinc-400"
                }`}
              >
                {i + 1}
              </span>
            )}
          />
        </div>
      );

    case "breadcrumb":
      return (
        <div className="flex h-full w-full items-center gap-1 text-[7px] text-zinc-400">
          <Bar w="16px" />
          <span>/</span>
          <Bar w="20px" />
          <span>/</span>
          <span className="truncate text-zinc-600">{label || "Current"}</span>
        </div>
      );

    case "avatar":
      return (
        <div className="flex h-full w-full items-center gap-1">
          <Dot className="size-4" />
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <Bar w="70%" />
            <Bar w="45%" />
          </span>
        </div>
      );

    case "avatarRow":
      return (
        <div className="flex h-full w-full flex-col justify-center gap-1.5">
          <Repeat
            n={3}
            render={(i) => (
              <span key={i} className="flex items-center gap-1">
                <Dot className="size-3" />
                <Bar w="60%" />
              </span>
            )}
          />
        </div>
      );

    case "badge":
      return (
        <div className="flex h-full w-full items-center">
          <span className="truncate rounded-full bg-zinc-200 px-1.5 py-0.5 text-[7px] text-zinc-600">
            {label || "badge"}
          </span>
        </div>
      );

    case "icon":
      return (
        <div className="flex h-full w-full items-center justify-center">
          <span className="size-3 rounded bg-zinc-300" />
        </div>
      );

    default:
      return (
        <div className="flex h-full w-full items-center">
          <span className="truncate text-[8px] text-zinc-500">{label}</span>
        </div>
      );
  }
}

/** Frame chrome hinting at the device the screen was designed for. */
function DeviceChrome({ device }: { device?: string }) {
  if (device === "mobile") {
    return <span className="mx-auto mt-1 block h-1 w-8 rounded-full bg-zinc-300" />;
  }
  if (device === "desktop") {
    return (
      <span className="flex items-center gap-1 px-1.5 py-1">
        <Repeat n={3} render={(i) => <span key={i} className="size-1 rounded-full bg-zinc-300" />} />
      </span>
    );
  }
  return null;
}

export function WireframeNode({ data, selected }: NodeProps<AiNodeType>) {
  const wf = data.wireframe;
  const elements: WireframeElement[] = wf?.elements ?? [];
  return (
    <div
      className={`flex h-full w-full flex-col overflow-hidden rounded-lg border bg-white shadow-sm ${
        selected ? "border-brand-accent ring-2 ring-brand-accent/30" : "border-zinc-300"
      }`}
    >
      <NodeResizer
        minWidth={220}
        minHeight={160}
        isVisible={!!selected}
        lineClassName="!border-brand-accent"
        handleClassName="!h-2 !w-2 !rounded-sm !border-white !bg-brand-accent"
      />
      <Handle type="target" position={Position.Top} className={handleClass} />
      <div className="flex items-center gap-2 border-b border-zinc-100 bg-zinc-50 px-2 py-1">
        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          {wf?.device ?? "wireframe"}
        </span>
        <span className="truncate text-[11px] text-zinc-700">{wf?.title || data.text}</span>
      </div>
      <DeviceChrome device={wf?.device} />
      <div className="relative flex-1 bg-white">
        {elements.map((el, i) => (
          <div
            key={i}
            className="absolute overflow-hidden"
            style={{ left: `${el.x}%`, top: `${el.y}%`, width: `${el.w}%`, height: `${el.h}%` }}
            title={`${el.type}: ${el.label}`}
          >
            <Element el={el} />
          </div>
        ))}
      </div>
      <Handle type="source" position={Position.Bottom} className={handleClass} />
    </div>
  );
}
