export type ForceNode = { id: string; x: number; y: number; vx: number; vy: number; degree: number };
export type ForceLink = { from: string; to: string };

export type ForceOptions = {
  /** How hard every node pushes every other away. */
  repulsion?: number;
  /** How strongly a link pulls its two ends together. */
  attraction?: number;
  /** Pull toward the origin, so disconnected islands don't drift off. */
  gravity?: number;
  /** Velocity retained per step. Lower settles faster, higher looks livelier. */
  damping?: number;
  iterations?: number;
};

const DEFAULTS: Required<ForceOptions> = {
  repulsion: 9000,
  attraction: 0.006,
  gravity: 0.012,
  damping: 0.82,
  iterations: 320,
};

/**
 * Deterministic scatter. A seeded start means the same graph always settles the
 * same way, so the map doesn't rearrange itself every time it is opened.
 */
function seedPositions(ids: string[]): ForceNode[] {
  return ids.map((id, i) => {
    // Golden-angle spiral: spreads evenly without clumping at the centre.
    const angle = i * 2.399963;
    const radius = 24 * Math.sqrt(i + 1);
    return {
      id,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
      degree: 0,
    };
  });
}

/**
 * A small force-directed layout: nodes repel, links pull, gravity keeps the
 * whole thing together. Written out rather than pulled in so it stays pure and
 * testable, and so the graph has no runtime dependency.
 */
export function layoutForce(
  ids: string[],
  links: ForceLink[],
  options: ForceOptions = {},
): ForceNode[] {
  const opts = { ...DEFAULTS, ...options };
  const nodes = seedPositions(ids);
  if (nodes.length === 0) return nodes;

  const index = new Map(nodes.map((n, i) => [n.id, i]));
  const edges = links
    .map((l) => ({ a: index.get(l.from), b: index.get(l.to) }))
    .filter((e): e is { a: number; b: number } => e.a !== undefined && e.b !== undefined && e.a !== e.b);

  for (const edge of edges) {
    nodes[edge.a].degree += 1;
    nodes[edge.b].degree += 1;
  }

  for (let step = 0; step < opts.iterations; step += 1) {
    // Repulsion — every pair pushes apart, falling off with distance.
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let distSq = dx * dx + dy * dy;
        if (distSq < 0.01) {
          // Exactly coincident nodes would divide by zero; nudge them apart.
          dx = (i % 2 === 0 ? 1 : -1) * 0.1;
          dy = (j % 2 === 0 ? 1 : -1) * 0.1;
          distSq = dx * dx + dy * dy;
        }
        const dist = Math.sqrt(distSq);
        const force = opts.repulsion / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
    }

    // Attraction along links.
    for (const edge of edges) {
      const a = nodes[edge.a];
      const b = nodes[edge.b];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      a.vx += dx * opts.attraction;
      a.vy += dy * opts.attraction;
      b.vx -= dx * opts.attraction;
      b.vy -= dy * opts.attraction;
    }

    // Gravity, then integrate.
    for (const node of nodes) {
      node.vx -= node.x * opts.gravity;
      node.vy -= node.y * opts.gravity;
      node.vx *= opts.damping;
      node.vy *= opts.damping;
      node.x += node.vx;
      node.y += node.vy;
    }
  }

  return nodes;
}

/** Bounding box of a settled layout, for fitting it to a viewport. */
export function boundsOf(nodes: ForceNode[]): { x: number; y: number; w: number; h: number } {
  if (nodes.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { x: minX, y: minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY };
}
