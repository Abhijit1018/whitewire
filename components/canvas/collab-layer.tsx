"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useReactFlow, useViewport } from "@xyflow/react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/core/supabase/client";
import { useWorkspaceStore, type AiNode } from "@/core/state/workspace-store";
import { createDebouncedSaver } from "./use-autosave";
import type { Edge } from "@xyflow/react";

/** Deterministic pleasant color from a user id, so a peer keeps one color. */
function colorFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 70% 55%)`;
}

type FlowPoint = { x: number; y: number };
type Peer = { id: string; name: string; color: string; cursor: FlowPoint | null; ts: number };

/**
 * Live collaboration over Supabase Realtime for one project.
 * - Presence + broadcast cursors (sent in flow coords so they stay anchored to
 *   the canvas as each viewer pans/zooms independently).
 * - Debounced graph sync: local edits broadcast the cleaned graph; remote
 *   graphs are applied through an echo guard so they don't re-broadcast.
 * Mounted inside ReactFlowProvider (needs coordinate conversion).
 */
export function CollabLayer({ projectId }: { projectId: string }) {
  const { screenToFlowPosition, flowToScreenPosition } = useReactFlow();
  useViewport(); // re-render peers' cursors as this viewer pans/zooms
  const setGraph = useWorkspaceStore((s) => s.setGraph);

  const [me, setMe] = useState<{ id: string; name: string; color: string } | null>(null);
  const [peers, setPeers] = useState<Record<string, Peer>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);
  const applyingRemote = useRef(false);

  // Resolve the current user once (workspace page — a single auth call is fine).
  useEffect(() => {
    let alive = true;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!alive || !data.user) return;
        const id = data.user.id;
        const name = (data.user.email ?? "Someone").split("@")[0];
        setMe({ id, name, color: colorFor(id) });
      });
    return () => {
      alive = false;
    };
  }, []);

  // Wire the realtime channel once we know who we are.
  useEffect(() => {
    if (!me) return;
    const supabase = createClient();
    const channel = supabase.channel(`project:${projectId}`, {
      config: { broadcast: { self: false }, presence: { key: me.id } },
    });
    channelRef.current = channel;

    channel.on("broadcast", { event: "cursor" }, ({ payload }) => {
      const p = payload as { id: string; name: string; color: string; cursor: FlowPoint | null };
      if (p.id === me.id) return;
      setPeers((prev) => ({
        ...prev,
        [p.id]: { id: p.id, name: p.name, color: p.color, cursor: p.cursor, ts: Date.now() },
      }));
    });

    channel.on("broadcast", { event: "graph" }, ({ payload }) => {
      const p = payload as { nodes: AiNode[]; edges: Edge[] };
      applyingRemote.current = true;
      setGraph(p.nodes ?? [], p.edges ?? []);
      // Release the guard after the store settles so our own subscriber skips it.
      requestAnimationFrame(() => {
        applyingRemote.current = false;
      });
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<{ id: string; name: string; color: string }>();
      setPeers((prev) => {
        const next: Record<string, Peer> = {};
        for (const key of Object.keys(state)) {
          const meta = state[key][0];
          if (!meta || meta.id === me.id) continue;
          next[meta.id] = prev[meta.id] ?? {
            id: meta.id,
            name: meta.name,
            color: meta.color,
            cursor: null,
            ts: Date.now(),
          };
        }
        return next;
      });
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.track({ id: me.id, name: me.name, color: me.color });
      }
    });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [me, projectId, setGraph]);

  // Broadcast local graph edits (debounced + JSON-deduped, echo-guarded).
  useEffect(() => {
    if (!me) return;
    const broadcast = createDebouncedSaver((snap) => {
      channelRef.current?.send({ type: "broadcast", event: "graph", payload: snap });
    }, 250);
    const unsub = useWorkspaceStore.subscribe((state) => {
      if (applyingRemote.current) return;
      const nodes = state.nodes.map(({ selected, dragging, ...n }) => n);
      broadcast({ nodes, edges: state.edges });
    });
    return unsub;
  }, [me]);

  // Broadcast this viewer's cursor (throttled) in flow coords.
  const sendCursor = useMemo(() => {
    let last = 0;
    return (cursor: FlowPoint | null) => {
      const now = Date.now();
      if (cursor && now - last < 45) return;
      last = now;
      if (!me) return;
      channelRef.current?.send({
        type: "broadcast",
        event: "cursor",
        payload: { id: me.id, name: me.name, color: me.color, cursor },
      });
    };
  }, [me]);

  useEffect(() => {
    if (!me) return;
    function onMove(e: PointerEvent) {
      sendCursor(screenToFlowPosition({ x: e.clientX, y: e.clientY }));
    }
    function onLeave() {
      sendCursor(null);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, [me, sendCursor, screenToFlowPosition]);

  // Prune peers whose cursor went stale (left / idle).
  useEffect(() => {
    const t = setInterval(() => {
      setPeers((prev) => {
        const now = Date.now();
        let changed = false;
        const next: Record<string, Peer> = {};
        for (const [id, p] of Object.entries(prev)) {
          if (p.cursor && now - p.ts > 8000) {
            next[id] = { ...p, cursor: null };
            changed = true;
          } else {
            next[id] = p;
          }
        }
        return changed ? next : prev;
      });
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const list = Object.values(peers);
  const active = list.filter((p) => p.cursor);

  return (
    <>
      {/* Presence pill */}
      {list.length > 0 && (
        <div className="pointer-events-none absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-full border border-border bg-surface/90 px-2.5 py-1 text-xs shadow-sm backdrop-blur">
          <span className="flex -space-x-1.5">
            {list.slice(0, 4).map((p) => (
              <span
                key={p.id}
                title={p.name}
                className="grid size-5 place-items-center rounded-full border border-surface text-[10px] font-semibold text-white"
                style={{ backgroundColor: p.color }}
              >
                {p.name[0]?.toUpperCase()}
              </span>
            ))}
          </span>
          <span className="text-muted-foreground">
            {list.length} {list.length === 1 ? "collaborator" : "collaborators"}
          </span>
        </div>
      )}

      {/* Remote cursors */}
      {active.map((p) => {
        const s = flowToScreenPosition(p.cursor as FlowPoint);
        return (
          <div
            key={p.id}
            className="pointer-events-none absolute z-30 -translate-y-1 will-change-transform"
            style={{ left: s.x, top: s.y, transition: "left 80ms linear, top 80ms linear" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={p.color} aria-hidden>
              <path d="M4 2l7 18 2.5-7L21 10 4 2z" stroke="white" strokeWidth="1.5" />
            </svg>
            <span
              className="ml-3 rounded px-1.5 py-0.5 text-[10px] font-medium text-white shadow"
              style={{ backgroundColor: p.color }}
            >
              {p.name}
            </span>
          </div>
        );
      })}
    </>
  );
}
