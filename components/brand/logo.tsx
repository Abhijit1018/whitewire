import { cn } from "@/lib/utils";

type LogoProps = {
  variant?: "full" | "mark";
  appearance?: "light" | "dark";
  className?: string;
};

function Mark({ solid, className }: { solid?: boolean; className?: string }) {
  // `solid` renders the whole mark in currentColor (used on the brand panel, so
  // the W doesn't camouflage into the same-hue gradient behind it). On light
  // surfaces the W/nib take the brand accent; the frame is always currentColor.
  const glyph = solid ? "currentColor" : "var(--brand-accent)";
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-8 w-8", className)}
      aria-hidden="true"
    >
      {/* rounded square frame */}
      <rect
        x="3"
        y="3"
        width="42"
        height="42"
        rx="12"
        stroke="currentColor"
        strokeWidth="3"
      />
      {/* W */}
      <path
        d="M13 16 L18 32 L24 20 L30 32 L35 16"
        stroke={glyph}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* pen nib accent */}
      <path d="M33 13 L37 17 L31 21 Z" fill={glyph} />
    </svg>
  );
}

export function Logo({ variant = "full", appearance = "light", className }: LogoProps) {
  const isDark = appearance === "dark";
  const markColor = isDark ? "text-white" : "text-foreground";
  if (variant === "mark") {
    return <Mark solid={isDark} className={cn(markColor, className)} />;
  }
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Mark solid={isDark} className={markColor} />
      <span className={cn("text-xl font-bold tracking-tight", markColor)}>
        {/* On the brand panel the wordmark is solid white; on light bg "Wire" takes the accent. */}
        White<span className={isDark ? undefined : "text-brand-accent"}>Wire</span>
      </span>
    </span>
  );
}
