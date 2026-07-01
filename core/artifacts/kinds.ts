export type GenType = "schema" | "api" | "orm" | "erd" | "ui" | "docs";

const ALL: GenType[] = ["schema", "api", "orm", "erd", "ui", "docs"];

export function generatorsForKind(kind: string): { primary: GenType[]; all: GenType[] } {
  switch (kind) {
    case "component":
      return { primary: ["ui", "docs"], all: ALL };
    case "feature":
      return { primary: ["api", "schema", "docs"], all: ALL };
    case "entity":
      return { primary: ["schema", "orm", "erd", "docs"], all: ALL };
    case "idea":
      return { primary: ["docs"], all: ALL };
    default:
      return { primary: ALL, all: ALL };
  }
}
