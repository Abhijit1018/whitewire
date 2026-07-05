import { cn } from "@/lib/utils";

/**
 * Hand-drawn marginalia. Deliberately imperfect strokes (uneven control points,
 * open corners) so the marks read as pen-on-paper, not vector-perfect chrome.
 * All inherit `currentColor` — set the color on the parent.
 */

export function HandUnderline({ className }: { className?: string }) {
  return (
    <svg
      className={cn("absolute -bottom-2 left-0 w-full", className)}
      viewBox="0 0 300 12"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d="M3 8.5C52 4 108 3.2 160 5.4C210 7.5 258 6 297 3.5"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Sparkle({ className }: { className?: string }) {
  return (
    <svg
      className={cn("inline-block", className)}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path d="M12 3.5c.7 4.2 2.3 5.8 6.5 6.5-4.2.7-5.8 2.3-6.5 6.5-.7-4.2-2.3-5.8-6.5-6.5 4.2-.7 5.8-2.3 6.5-6.5Z"
        fill="currentColor" />
      <path d="M19 15c.3 1.6.9 2.2 2.5 2.5-1.6.3-2.2.9-2.5 2.5-.3-1.6-.9-2.2-2.5-2.5 1.6-.3 2.2-.9 2.5-2.5Z"
        fill="currentColor" opacity="0.7" />
    </svg>
  );
}

export function CurveArrow({ className }: { className?: string }) {
  return (
    <svg className={cn(className)} width="70" height="60" viewBox="0 0 70 60" fill="none" aria-hidden>
      <path
        d="M6 6C10 26 26 44 52 46"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M40 40l13 6-3 -14"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

/** Handwritten kicker line, e.g. "Your infinite space for ideas". */
export function Scribble({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-hand text-xl text-brand-accent", className)}>
      {children}
      <Sparkle className="text-brand-accent" />
    </span>
  );
}
