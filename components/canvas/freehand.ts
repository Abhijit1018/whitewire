import { getStroke } from "perfect-freehand";

const OPTIONS = { thinning: 0.5, smoothing: 0.5, streamline: 0.5 };

/** Builds an SVG fill path for a freehand stroke from raw [x,y] points. */
export function strokePath(points: number[][], size = 6): string {
  const outline = getStroke(points, { size, ...OPTIONS });
  if (!outline.length) return "";
  const d = outline.reduce<(number | string)[]>(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ["M", outline[0][0], outline[0][1], "Q"],
  );
  d.push("Z");
  return d.join(" ");
}
