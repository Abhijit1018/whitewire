import {
  HTMLContainer,
  Rectangle2d,
  ShapeUtil,
  T,
  type RecordProps,
  type TLBaseShape,
} from "tldraw";

// Augment the global shape registry so AiNodeShape satisfies TLShape
declare module "@tldraw/tlschema" {
  interface TLGlobalShapePropsMap {
    "ai-node": {
      w: number;
      h: number;
      text: string;
      kind: string;
      purpose: string;
      model: string;
    };
  }
}

export type AiNodeShape = TLBaseShape<
  "ai-node",
  { w: number; h: number; text: string; kind: string; purpose: string; model: string }
>;

export class AiNodeUtil extends ShapeUtil<AiNodeShape> {
  static override type = "ai-node" as const;
  static override props: RecordProps<AiNodeShape> = {
    w: T.number,
    h: T.number,
    text: T.string,
    kind: T.string,
    purpose: T.string,
    model: T.string,
  };

  getDefaultProps(): AiNodeShape["props"] {
    return { w: 220, h: 100, text: "New node", kind: "generic", purpose: "", model: "" };
  }

  getGeometry(shape: AiNodeShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }

  component(shape: AiNodeShape) {
    return (
      <HTMLContainer
        style={{
          width: shape.props.w,
          height: shape.props.h,
          padding: 12,
          borderRadius: 10,
          border: "1px solid #d4d4d8",
          background: "white",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          overflow: "hidden",
          pointerEvents: "all",
        }}
      >
        <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: "#71717a" }}>
          {shape.props.kind}
        </span>
        <span style={{ fontSize: 14, color: "#18181b", lineHeight: 1.3 }}>{shape.props.text}</span>
      </HTMLContainer>
    );
  }

  getIndicatorPath(shape: AiNodeShape): Path2D {
    const path = new Path2D();
    // Rounded rect matching the component's 10px border-radius
    path.roundRect(0, 0, shape.props.w, shape.props.h, 10);
    return path;
  }
}
