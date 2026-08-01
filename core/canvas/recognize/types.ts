export type Point = [number, number];

export type Bbox = { x: number; y: number; w: number; h: number };

/** What a single freehand stroke was drawn as. */
export type ShapeKind = "rect" | "ellipse" | "diamond" | "line" | "arrow" | "scribble";

export type RecognizedStroke = {
  id: string;
  kind: ShapeKind;
  bbox: Bbox;
  /** 0–1. Low confidence shapes are described to the model as uncertain. */
  confidence: number;
  start: Point;
  /** For arrows this is the head, which may sit before the last drawn point. */
  end: Point;
};

/** A group of small strokes that together look like handwriting. */
export type TextCluster = {
  id: string;
  bbox: Bbox;
  strokeIds: string[];
  /** Filled in by OCR; empty when unread or below the confidence floor. */
  text: string;
};

export type SketchShape = {
  id: string;
  kind: "rect" | "ellipse" | "diamond";
  bbox: Bbox;
  confidence: number;
  /** Label read from handwriting inside the shape, if any. */
  label: string;
};

export type SketchConnection = {
  fromId: string;
  toId: string;
  directed: boolean;
};

export type SketchGraph = {
  shapes: SketchShape[];
  connections: SketchConnection[];
  /** shapeId → ids of shapes drawn inside it. */
  containment: { parentId: string; childId: string }[];
  /** Handwriting that did not land inside any shape. */
  looseLabels: string[];
};
