import { strokePath } from "./freehand";
import type { TextCluster } from "@/core/canvas/recognize";

/** Tesseract scores 0–100; below this the read is noise and we drop it. */
const MIN_CONFIDENCE = 60;
/** Upscaling small handwriting materially improves recognition. */
const SCALE = 3;
const PAD = 6;
/** Guard against a canvas full of doodles turning into a minute of OCR. */
const MAX_CLUSTERS = 12;

export type OcrStroke = { id: string; points: number[][]; color?: string; size?: number };

/** Renders one cluster's strokes onto a white canvas, cropped and upscaled. */
function clusterToCanvas(cluster: TextCluster, strokes: Map<string, OcrStroke>): HTMLCanvasElement {
  const { bbox } = cluster;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil((bbox.w + PAD * 2) * SCALE));
  canvas.height = Math.max(1, Math.ceil((bbox.h + PAD * 2) * SCALE));

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(SCALE, 0, 0, SCALE, -(bbox.x - PAD) * SCALE, -(bbox.y - PAD) * SCALE);

  for (const id of cluster.strokeIds) {
    const stroke = strokes.get(id);
    if (!stroke) continue;
    const d = strokePath(stroke.points, stroke.size ?? 6);
    if (!d) continue;
    // Always black on white — OCR does far better than with the pen's colour.
    ctx.fillStyle = "#000";
    ctx.fill(new Path2D(d));
  }
  return canvas;
}

/**
 * Reads handwriting clusters with Tesseract, in the browser. The engine is
 * imported lazily so it stays out of the initial bundle, and a failure here is
 * never fatal — unread clusters simply keep an empty label and the model names
 * those nodes from structure instead.
 */
export async function readTextClusters(
  clusters: TextCluster[],
  strokes: OcrStroke[],
): Promise<TextCluster[]> {
  if (clusters.length === 0) return clusters;

  const byId = new Map(strokes.map((s) => [s.id, s]));
  const targets = clusters.slice(0, MAX_CLUSTERS);

  let worker: Awaited<ReturnType<typeof import("tesseract.js").createWorker>> | null = null;
  try {
    const { createWorker } = await import("tesseract.js");
    worker = await createWorker("eng");

    const read = await Promise.all(
      targets.map(async (cluster) => {
        try {
          const { data } = await worker!.recognize(clusterToCanvas(cluster, byId));
          const text = data.text.replace(/\s+/g, " ").trim();
          if (!text || data.confidence < MIN_CONFIDENCE) return cluster;
          return { ...cluster, text };
        } catch {
          return cluster;
        }
      }),
    );
    return [...read, ...clusters.slice(MAX_CLUSTERS)];
  } catch {
    return clusters;
  } finally {
    await worker?.terminate().catch(() => {});
  }
}
