import { strokePath } from "./freehand";
import type { AiNode } from "@/core/state/workspace-store";

/** Rasterizes all freehand pen strokes on the board into a white-background PNG data URL. */
export async function drawNodesToPng(nodes: AiNode[]): Promise<string | null> {
  const draws = nodes.filter((n) => n.type === "drawNode" && (n.data.points?.length ?? 0) > 1);
  if (draws.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of draws) {
    for (const [x, y] of n.data.points!) {
      minX = Math.min(minX, n.position.x + x);
      minY = Math.min(minY, n.position.y + y);
      maxX = Math.max(maxX, n.position.x + x);
      maxY = Math.max(maxY, n.position.y + y);
    }
  }
  const pad = 24;
  const w = Math.ceil(maxX - minX) + pad * 2;
  const h = Math.ceil(maxY - minY) + pad * 2;
  if (w <= 0 || h <= 0) return null;

  const paths = draws
    .map((n) => {
      const dx = n.position.x - minX + pad;
      const dy = n.position.y - minY + pad;
      const pts = n.data.points!.map(([x, y]) => [x + dx, y + dy]);
      return `<path d="${strokePath(pts, n.data.size ?? 6)}" fill="${n.data.color ?? "#111"}"/>`;
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="white"/>${paths}</svg>`;
  const dataUrl = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));

  return await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}
