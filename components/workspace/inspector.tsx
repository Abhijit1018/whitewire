"use client";

import { useEffect, useState, useTransition } from "react";
import { useWorkspaceStore } from "@/core/state/workspace-store";
import { generatorsForKind, type GenType } from "@/core/artifacts/kinds";
import { hashSource } from "@/core/artifacts/hash";
import { MermaidDiagram } from "./mermaid-diagram";
import { generateArtifactAction, listNodeArtifactsAction } from "@/app/p/[projectId]/artifact-actions";
import {
  addAttachmentAction,
  listNodeAttachmentsAction,
  deleteAttachmentAction,
  uploadFileAction,
} from "@/app/p/[projectId]/attachment-actions";
import { wireframeAction, refineAction } from "@/app/p/[projectId]/design-actions";

type Artifact = { id: string; type: string; content: string; sourceHash: string };
type Attachment = { id: string; type: string; content: string };
const ATTACH_TYPES = ["note", "link", "comment", "snippet"] as const;

export function Inspector({ projectId }: { projectId: string }) {
  const selectedNodeId = useWorkspaceStore((s) => s.selectedNodeId);
  const text = useWorkspaceStore((s) => s.selectedNodeText);
  const kind = useWorkspaceStore((s) => s.selectedNodeKind);
  const nodeType = useWorkspaceStore((s) => s.selectedNodeType);
  const updateNodeData = useWorkspaceStore((s) => s.updateNodeData);
  const deleteNode = useWorkspaceStore((s) => s.deleteNode);
  const addNodesEdges = useWorkspaceStore((s) => s.addNodesEdges);

  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
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
    return (
      <p className="mt-2 text-sm text-muted-foreground">
        Select a node to inspect and generate from it.
      </p>
    );
  }

  const isAi = nodeType === "aiNode" || nodeType === "";
  const gens = generatorsForKind(kind);
  const shown = showAll ? gens.all : gens.primary;
  const currentHash = hashSource(text);

  function copy(id: string, content: string) {
    navigator.clipboard?.writeText(content);
    setCopied(id);
    setTimeout(() => setCopied((c) => (c === id ? null : c)), 1200);
  }

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

  function refine() {
    const nodeId = selectedNodeId;
    if (!nodeId) return;
    startTransition(async () => {
      setError(null);
      const res = await refineAction(projectId, text);
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.text) updateNodeData(nodeId, { text: res.text });
    });
  }

  function generateWireframe() {
    const nodeId = selectedNodeId;
    if (!nodeId) return;
    startTransition(async () => {
      setError(null);
      const res = await wireframeAction(projectId, text);
      if (res.error) {
        setError(res.error);
        return;
      }
      const spec = res.spec;
      if (!spec) return;
      const parent = useWorkspaceStore.getState().nodes.find((n) => n.id === nodeId);
      const px = (parent?.position.x ?? 0) + 320;
      const py = parent?.position.y ?? 0;
      const wid = crypto.randomUUID();
      addNodesEdges(
        [
          {
            id: wid,
            type: "wireframeNode",
            position: { x: px, y: py },
            style: { width: 320, height: 240 },
            data: { text: spec.title || "Wireframe", kind: "component", purpose: "", model: "", wireframe: spec },
          },
        ],
        [{ id: crypto.randomUUID(), source: nodeId, target: wid }],
      );
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

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const nodeId = selectedNodeId;
    e.target.value = "";
    if (!file || !nodeId) return;
    const fd = new FormData();
    fd.set("file", file);
    startTransition(async () => {
      setError(null);
      const res = await uploadFileAction(projectId, nodeId, fd);
      if (res.error) {
        setError(res.error);
        return;
      }
      await refresh(nodeId);
    });
  }

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto pr-1 text-sm">
      <header className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600">
            {kind || "node"}
          </span>
          <button
            type="button"
            onClick={() => deleteNode(selectedNodeId)}
            className="text-xs text-zinc-400 transition-colors hover:text-red-500"
          >
            Delete node
          </button>
        </div>
        <input
          key={selectedNodeId}
          defaultValue={text}
          onChange={(e) => updateNodeData(selectedNodeId, { text: e.target.value })}
          placeholder="Node text"
          className="w-full rounded-md border border-zinc-200 px-2 py-1.5 text-sm font-medium leading-snug text-zinc-900 outline-none transition-colors focus:border-indigo-300"
        />
      </header>

      {error && (
        <p className="rounded-md bg-red-50 px-2.5 py-1.5 text-red-600">{error}</p>
      )}

      {isAi && (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            disabled={pending}
            onClick={refine}
            className="rounded-md border border-zinc-200 px-2.5 py-1 text-zinc-700 transition-all hover:bg-zinc-100 active:scale-95 disabled:opacity-50"
          >
            Refine text
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={generateWireframe}
            className="rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-indigo-700 transition-all hover:bg-indigo-100 active:scale-95 disabled:opacity-50"
          >
            Wireframe
          </button>
        </div>
      )}

      {isAi && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Generate
            </h3>
            {gens.primary.length < gens.all.length && (
              <button
                className="text-xs text-indigo-600 transition-colors hover:text-indigo-800"
                onClick={() => setShowAll((v) => !v)}
              >
                {showAll ? "Less" : "More"}
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {shown.map((t) => (
              <button
                key={t}
                type="button"
                disabled={pending}
                onClick={() => generate(t)}
                className="rounded-md border border-zinc-200 px-2.5 py-1 capitalize text-zinc-700 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 active:scale-95 disabled:opacity-50"
              >
                {t}
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Artifacts
        </h3>
        {artifacts.length === 0 ? (
          <p className="text-muted-foreground">
            {isAi ? "None yet — generate one above." : "Generators are available on AI nodes."}
          </p>
        ) : (
          <ul className="space-y-3">
            {artifacts.map((a) => {
              const stale = a.sourceHash !== currentHash;
              return (
                <li key={a.id} className="overflow-hidden rounded-lg border border-zinc-200">
                  <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-2.5 py-1.5">
                    <span className="flex items-center gap-2">
                      <span className="text-xs font-semibold capitalize text-zinc-700">
                        {a.type}
                      </span>
                      {stale && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                          stale
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-2">
                      <button
                        className="text-xs text-zinc-500 transition-colors hover:text-zinc-800"
                        onClick={() => copy(a.id, a.content)}
                      >
                        {copied === a.id ? "Copied" : "Copy"}
                      </button>
                      <button
                        className="text-xs text-indigo-600 transition-colors hover:text-indigo-800 disabled:opacity-50"
                        disabled={pending}
                        onClick={() => generate(a.type as GenType)}
                      >
                        Regenerate
                      </button>
                    </span>
                  </div>
                  {a.type === "erd" ? (
                    <MermaidDiagram code={a.content} />
                  ) : (
                    <pre className="max-h-56 overflow-auto bg-white p-2.5 font-mono text-[11px] leading-relaxed text-zinc-800">
                      {a.content}
                    </pre>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Attachments
        </h3>
        <div className="flex gap-1.5">
          <select
            value={attType}
            onChange={(e) => setAttType(e.target.value as (typeof ATTACH_TYPES)[number])}
            className="rounded-md border border-zinc-200 px-1.5 text-xs"
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
            onKeyDown={(e) => e.key === "Enter" && addAttachment()}
            placeholder="Add note / link / comment…"
            className="flex-1 rounded-md border border-zinc-200 px-2 py-1 text-sm outline-none focus:border-indigo-300"
          />
          <button
            type="button"
            disabled={pending}
            onClick={addAttachment}
            className="rounded-md bg-zinc-900 px-2.5 py-1 text-sm text-white transition-all hover:bg-zinc-700 active:scale-95 disabled:opacity-50"
          >
            Add
          </button>
        </div>
        <label className="mt-2 inline-flex cursor-pointer items-center gap-1 text-xs text-indigo-600 transition-colors hover:text-indigo-800">
          + Upload file
          <input type="file" className="hidden" onChange={handleFile} disabled={pending} />
        </label>
        {attachments.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {attachments.map((at) => {
              const isFile = at.type === "file";
              const [fileName, fileUrl] = isFile ? at.content.split("::") : ["", ""];
              return (
                <li
                  key={at.id}
                  className="flex items-start justify-between gap-2 rounded-md border border-zinc-200 px-2.5 py-1.5"
                >
                  <span className="min-w-0">
                    <span className="mr-1.5 text-[10px] uppercase text-zinc-400">{at.type}</span>
                    {isFile ? (
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="break-words text-indigo-600 hover:underline"
                      >
                        {fileName || "Open file"}
                      </a>
                    ) : (
                      <span className="break-words text-zinc-700">{at.content}</span>
                    )}
                  </span>
                  <button
                    className="shrink-0 text-zinc-400 transition-colors hover:text-red-500"
                    onClick={() => removeAttachment(at.id)}
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
