import { SCENE_NODE_TYPES } from "@/core/ai/scene";
import { WIREFRAME_TYPES } from "@/core/ai/wireframe";

const TYPE_GUIDE = [
  '"concept" — an idea, feature or component. One short title, one line of detail.',
  '"note" — an aside, caveat, question or todo. Small.',
  '"group" — a titled container. Put related nodes inside it with "parent".',
  '"table" — a data entity. Give it columns with types and pk/fk markers.',
  '"code" — a real snippet. Give language and source.',
  '"image" / "video" — media. Give a url if you genuinely know one, else just a caption.',
  '"wireframe" — a UI screen. Give it {"title","device","elements"} where device',
  '  is "desktop", "tablet" or "mobile", and each element is',
  '  {"type","label","x","y","w","h"} on a 100x100 grid (x,y = top-left, in %).',
  "  Use 8-18 elements so the screen reads as a real layout.",
  '"shape" — a flowchart primitive. Set "shape" to one of the ids below.',
].join("\n- ");

const SHAPE_GUIDE = [
  'diamond for a decision, cylinder for a datastore, parallelogram for input or',
  'output, hexagon for a prepared step, cloud for an external service,',
  'speechBubble for a comment, plus rectangle, roundRect, ellipse, triangle,',
  'star, heart, line, arrow and arrowBlock.',
].join(" ");

/**
 * Teaches the model the full scene vocabulary. Without this it defaults to a
 * uniform grid of title-plus-one-line boxes, which is what the flat blueprint
 * format used to force.
 */
export function buildScenePrompt(request: string, board = ""): string {
  const existing = board.trim()
    ? [
        "",
        board.trim(),
        "",
        "This board already exists. Do NOT rebuild it. Extend it:",
        '- Reference an existing node by its handle (#1, #2) in "edges" and "parent",',
        "  so new work connects to what is already there.",
        '- To reword or re-describe an existing node, add it to "updates" as',
        '  {"target":"#2","title":"...","body":"..."} instead of adding a duplicate.',
        '- Only put genuinely new things in "nodes".',
        "- If the request is ambiguous about which existing nodes it affects, ask",
        "  instead of guessing (see the question form below).",
        "",
      ].join("\n")
    : "";

  return [
    "You are building a board on a design canvas. Return a scene of mixed nodes —",
    "not a uniform grid of identical boxes.",
    existing,
    "",
    "Node types:",
    `- ${TYPE_GUIDE}`,
    "",
    "Choose the type that actually fits the content. A database belongs in a",
    '"table" with real columns, not a "concept" describing a table. A UI screen',
    'belongs in a "wireframe", not a paragraph about one. Related nodes belong',
    'inside a "group". Use "code" when a snippet says it better than prose.',
    "",
    'Size each node: "sm", "md", "lg" or "xl". Tables, code, media and wireframes',
    "usually need lg or xl; a passing note is sm.",
    "",
    `Shape ids: ${SHAPE_GUIDE}`,
    'When several identical things run in parallel — "3 workers", "many queued',
    'jobs" — use one node with "stack": 3 rather than repeating it.',
    "",
    'Choose a "layout" for the board — how the nodes should be arranged:',
    '- "flow" (default) for a general board',
    '- "mindmap" when one central idea radiates into branches',
    '- "tree" for a hierarchy or breakdown, laid out in layers by the edges',
    '- "matrix" for a 2x2 comparison such as a SWOT',
    '- "timeline" for a sequence of steps or phases in order',
    "",
    "Reply with ONLY JSON of this shape:",
    "{",
    '  "layout": "flow",',
    '  "nodes": [',
    '    {"id":"api","type":"concept","title":"REST API","body":"Public surface","size":"md"},',
    '    {"id":"store","type":"group","title":"Storage","size":"xl"},',
    '    {"id":"users","type":"table","title":"users","parent":"store","size":"lg",',
    '     "table":{"columns":[{"name":"id","type":"uuid","key":"pk"},{"name":"email","type":"text"}]}}',
    "  ],",
    '  "edges": [{"from":"api","to":"users","label":"1. reads","note":"by id"}]',
    "}",
    "",
    'Every id is a short slug you invent. "parent" and edge endpoints must',
    "reference either an id in this reply or a #handle from the board above.",
    "Use 5-12 nodes. Label edges when the label adds meaning; leave it out otherwise.",
    `Wireframe element types: ${WIREFRAME_TYPES.join(", ")}.`,
    `Valid node types: ${SCENE_NODE_TYPES.join(", ")}.`,
    "",
    `Request: ${request}`,
  ].join("\n");
}

/**
 * Breaking one node into its parts. Same vocabulary as a full scene, so a
 * concept can expand into real tables, snippets or a screen rather than more
 * boxes of prose.
 */
export function buildExpandScenePrompt(text: string): string {
  return [
    "Break the following concept into 3 to 7 concrete, distinct parts.",
    "Return them as canvas nodes, choosing the type that fits each part.",
    "",
    "Node types:",
    `- ${TYPE_GUIDE}`,
    "",
    'A data store becomes a "table" with real columns. A screen becomes a',
    '"wireframe". An algorithm worth showing becomes "code". Otherwise use',
    '"concept" with a short title and one line of detail.',
    'Size each node "sm", "md", "lg" or "xl".',
    "",
    "Reply with ONLY JSON:",
    '{"nodes":[{"id":"slug","type":"concept","title":"...","body":"...","size":"md"}],"edges":[]}',
    "Add edges only between the parts themselves; the parent is linked for you.",
    "",
    `Concept: "${text}"`,
  ].join("\n");
}
