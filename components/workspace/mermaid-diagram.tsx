"use client";

import { useEffect, useState } from "react";

function stripFences(text: string): string {
  const m = text.match(/```(?:mermaid)?\s*([\s\S]*?)```/i);
  return (m ? m[1] : text).trim();
}

/** Renders Mermaid source (e.g. an erDiagram) as SVG, falling back to the raw code. */
export function MermaidDiagram({ code }: { code: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const source = stripFences(code);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "loose" });
        const id = "mmd-" + Math.random().toString(36).slice(2);
        const { svg } = await mermaid.render(id, source);
        if (!cancelled) setSvg(svg);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source]);

  if (failed) {
    return (
      <pre className="max-h-56 overflow-auto bg-white p-2.5 font-mono text-[11px] leading-relaxed text-zinc-800">
        {source}
      </pre>
    );
  }
  if (!svg) {
    return <div className="p-3 text-xs text-muted-foreground">Rendering diagram…</div>;
  }
  return (
    <div
      className="overflow-auto bg-white p-2 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
