import { cn } from "@/lib/utils";

type LogoProps = {
  variant?: "full" | "mark";
  appearance?: "light" | "dark";
  className?: string;
};

function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-8 w-8", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ww-grad" x1="6" y1="42" x2="42" y2="6" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--brand-violet)" />
          <stop offset="1" stopColor="var(--brand-blue)" />
        </linearGradient>
      </defs>
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
      {/* gradient W */}
      <path
        d="M13 16 L18 32 L24 20 L30 32 L35 16"
        stroke="url(#ww-grad)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* pen nib accent */}
      <path
        d="M33 13 L37 17 L31 21 Z"
        fill="url(#ww-grad)"
      />
    </svg>
  );
}

export function Logo({ variant = "full", appearance = "light", className }: LogoProps) {
  const isDark = appearance === "dark";
  const markColor = isDark ? "text-white" : "text-foreground";
  if (variant === "mark") {
    return <Mark className={cn(markColor, className)} />;
  }
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Mark className={markColor} />
      <span className={cn("text-xl font-bold tracking-tight", markColor)}>
        {/* On the dark/gradient panel the wordmark is solid white; on light bg "Wire" is gradient. */}
        White<span className={isDark ? undefined : "text-gradient-brand"}>Wire</span>
      </span>
    </span>
  );
}
