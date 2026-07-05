import { toPng, toSvg } from "html-to-image";
import { getNodesBounds, getViewportForBounds, type Node } from "@xyflow/react";

function triggerDownload(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

/**
 * Export the whole board (not just the visible viewport) as an image.
 * Frames all nodes, renders the React Flow viewport with html-to-image, and
 * downloads. "pdf" reuses the PNG in a print window so the browser can "Save
 * as PDF" without pulling in a PDF library.
 */
export async function exportBoard(nodes: Node[], type: "png" | "svg" | "pdf"): Promise<void> {
  if (nodes.length === 0) throw new Error("Nothing on the board yet.");
  const viewport = document.querySelector(".react-flow__viewport") as HTMLElement | null;
  if (!viewport) throw new Error("Canvas not ready.");

  const bounds = getNodesBounds(nodes);
  const pad = 80;
  const width = Math.min(Math.max(bounds.width + pad * 2, 640), 4096);
  const height = Math.min(Math.max(bounds.height + pad * 2, 480), 4096);
  const vp = getViewportForBounds(bounds, width, height, 0.2, 2, 0.12);

  const options = {
    backgroundColor: "#fdfbf8",
    width,
    height,
    pixelRatio: 2,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`,
    },
  };

  if (type === "svg") {
    triggerDownload(await toSvg(viewport, options), "whitewire-board.svg");
    return;
  }

  const png = await toPng(viewport, options);
  if (type === "png") {
    triggerDownload(png, "whitewire-board.png");
    return;
  }

  // pdf via a print window
  const win = window.open("", "_blank");
  if (!win) throw new Error("Allow pop-ups to export a PDF.");
  win.document.write(
    `<title>WhiteWire board</title><body style="margin:0"><img src="${png}" style="width:100%"/></body>`,
  );
  win.document.close();
  setTimeout(() => win.print(), 350);
}
