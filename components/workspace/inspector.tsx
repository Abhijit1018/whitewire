"use client";

import { useEffect, useState, useTransition } from "react";
import { useWorkspaceStore } from "@/core/state/workspace-store";
import { generatorsForKind, type GenType } from "@/core/artifacts/kinds";
import { hashSource } from "@/core/artifacts/hash";
import { generateArtifactAction, listNodeArtifactsAction } from "@/app/p/[projectId]/artifact-actions";
import {
  addAttachmentAction,
  listNodeAttachmentsAction,
  deleteAttachmentAction,
} from "@/app/p/[projectId]/attachment-actions";

type Artifact = { id: string; type: string; content: string; sourceHash: string };
type Attachment = { id: string; type: string; content: string };
const ATTACH_TYPES = ["note", "link", "comment", "snippet"] as const;

export function Inspector({ projectId }: { projectId: string }) {
  const selectedNodeId = useWorkspaceStore((s) => s.selectedNodeId);
  const text = useWorkspaceStore((s) => s.selectedNodeText);
  const kind = useWorkspaceStore((s) => s.selectedNodeKind);

  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [attType, setAttType] = useState<(typeof ATTACH_TYPES)[number]>("note");
  const [attText, setAttText] = useState("");
  const [pending, startTransition] = useTransition();

  async function refresh(nodeId: string) {
    const [a, at] = await Promise.all([
      listNodeArtifactsAction(projectId, nodeId),
      listNodeAttachmentsAction(projectId, nodeId),
    ]);
    setArtifacts(a as Artifact[]);
    setAttachments(at as Attachment[]);
  }

  useEffect(() => {
    setError(null);
    setShowAll(false);
    setAttText("");
    if (!selectedNodeId) {
      setArtifacts([]);
      setAttachments([]);
      return;
    }
    refresh(selectedNodeId).catch(() => setError("Failed to load node data"));
  }, [selectedNodeId, projectId]);

  if (!selectedNodeId) {
    return <p className="text-sm text-muted-foreground">Select an AI Node to inspect.</p>;
  }

  const gens = generatorsForKind(kind);
  const shown = showAll ? gens.all : gens.primary;
  const currentHash = hashSource(text);

  function generate(type: GenType) {
    const nodeId = selectedNodeId;
    if (!nodeId) return;
    startTransition(async () => {
      setError(null);
      try {
        const res = await generateArtifactAction(projectId, nodeId, type, text);
        if (res.error) {
          setError(res.error);
          return;
        }
        await refresh(nodeId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Generation failed");
      }
    });
  }

  function addAttachment() {
    const nodeId = selectedNodeId;
    if (!nodeId || !attText.trim()) return;
    startTransition(async () => {
      setError(null);
      try {
        await addAttachmentAction(projectId, nodeId, attType, attText);
        setAttText("");
        await refresh(nodeId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Add failed");
      }
    });
  }

  function removeAttachment(id: string) {
    const nodeId = selectedNodeId;
    if (!nodeId) return;
    startTransition(async () => {
      try {
        await deleteAttachmentAction(id);
        await refresh(nodeId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Delete failed");
      }
    });
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto text-sm">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{kind || "node"}</p>
        <p className="font-medium">{text || "(empty)"}</p>
      </div>

      {error && <p className="rounded bg-red-50 px-2 py-1 text-red-600">{error}</p>}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="font-medium">Generate</span>
          {gens.primary.length < gens.all.length && (
            <button className="text-xs underline" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Less" : "More"}
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {shown.map((t) => (
            <button
              key={t}
              type="button"
              disabled={pending}
              onClick={() => generate(t)}
              className="rounded border px-2 py-1 capitalize disabled:opacity-50"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="font-medium">Artifacts</span>
        {artifacts.length === 0 ? (
          <p className="text-muted-foreground">None yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {artifacts.map((a) => {
              const stale = a.sourceHash !== currentHash;
              return (
                <li key={a.id} className="rounded border p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">{a.type}</span>
                    <span className="flex items-center gap-2">
                      {stale && <span className="rounded bg-amber-100 px-1 text-xs text-amber-700">stale</span>}
                      <button className="text-xs underline" disabled={pending} onClick={() => generate(a.type as GenType)}>
                        Regenerate
                      </button>
                    </span>
                  </div>
                  <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap text-xs">{a.content}</pre>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div>
        <span className="font-medium">Attachments</span>
        <div className="mt-2 flex gap-2">
          <select
            value={attType}
            onChange={(e) => setAttType(e.target.value as (typeof ATTACH_TYPES)[number])}
            className="rounded border px-1"
          >
            {ATTACH_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            value={attText}
            onChange={(e) => setAttText(e.target.value)}
            placeholder="Add note/link/comment/snippet…"
            className="flex-1 rounded border px-2 py-1"
          />
          <button type="button" disabled={pending} onClick={addAttachment} className="rounded bg-black px-2 py-1 text-white disabled:opacity-50">
            Add
          </button>
        </div>
        {attachments.length > 0 && (
          <ul className="mt-2 space-y-1">
            {attachments.map((at) => (
              <li key={at.id} className="flex items-start justify-between gap-2 rounded border p-2">
                <span>
                  <span className="mr-1 text-xs uppercase text-muted-foreground">{at.type}</span>
                  {at.content}
                </span>
                <button className="text-xs text-red-500" onClick={() => removeAttachment(at.id)}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
