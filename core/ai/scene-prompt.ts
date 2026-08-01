import { SCENE_NODE_TYPES } from "@/core/ai/scene";
import { WIREFRAME_TYPES } from "@/core/ai/wireframe";

const TYPE_GUIDE = [
  '"concept" — an idea, feature or component. One short title, one line of detail.',
  '"note" — an aside, caveat, question or todo. Small.',
  '"group" — a titled container. Put related nodes inside it with "parent".',
  '"table" — a data entity. Give it columns with types and pk/fk markers.',
  '"code" — a real snippet. Give language and source.',
  '"image" / "video" — media. Give a url if you genuinely know one, else just a caption.',
  '"wireframe" — a UI screen laid out on a 100x100 grid.',
  '"shape" — a flowchart primitive such as a diamond for a decision.',
].join("\n- ");

/**
 * Teaches the model the full scene vocabulary. Without this it defaults to a
 * uniform grid of title-plus-one-line boxes, which is what the flat blueprint
 * format used to force.
 */
export function buildScenePrompt(request: string): string {
  return [
    "You are building a board on a design canvas. Return a scene of mixed nodes —",
    "not a uniform grid of identical boxes.",
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
    "Reply with ONLY JSON of this shape:",
    "{",
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
    "reference ids that exist. Use 5-12 nodes. Label edges when the label adds",
    "meaning; leave it out otherwise.",
    `Wireframe element types: ${WIREFRAME_TYPES.join(", ")}.`,
    `Valid node types: ${SCENE_NODE_TYPES.join(", ")}.`,
    "",
    `Request: ${request}`,
  ].join("\n");
}
