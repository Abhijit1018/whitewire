import Link from "next/link";
import { Fragment } from "react";

export function Topbar({
  breadcrumbs,
  actions,
}: {
  breadcrumbs: { label: string; href?: string }[];
  actions?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-surface/80 px-8 backdrop-blur">
      <nav className="flex items-center gap-2 text-sm">
        {breadcrumbs.map((b, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="text-muted-foreground">/</span>}
            {b.href ? (
              <Link href={b.href} className="text-muted-foreground hover:text-foreground">
                {b.label}
              </Link>
            ) : (
              <span className="font-medium text-foreground">{b.label}</span>
            )}
          </Fragment>
        ))}
      </nav>
      {actions}
    </header>
  );
}
