"use client";

import dynamic from "next/dynamic";
import { CanvasErrorBoundary } from "./canvas-error-boundary";

const WhiteboardInner = dynamic(() => import("./whiteboard-inner"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
      Loading canvas…
    </div>
  ),
});

export type WhiteboardProps = {
  projectId: string;
  initial: Record<string, unknown> | null;
  canEdit?: boolean;
};

export function Whiteboard({ projectId, initial, canEdit = true }: WhiteboardProps) {
  return (
    <CanvasErrorBoundary>
      <WhiteboardInner projectId={projectId} initial={initial} canEdit={canEdit} />
    </CanvasErrorBoundary>
  );
}
