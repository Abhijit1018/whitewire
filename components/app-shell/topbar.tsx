import Link from "next/link";
import { Fragment } from "react";
import { MobileNav } from "./mobile-nav";

export function Topbar({
  breadcrumbs,
  actions,
}: {
  breadcrumbs: { label: string; href?: string }[];
  actions?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-2 border-b border-border bg-surface/80 px-4 backdrop-blur md:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <MobileNav />
        <nav className="flex min-w-0 items-center gap-2 text-sm">
          {breadcrumbs.map((b, i) => (
            <Fragment key={i}>
              {i > 0 && <span className="text-muted-foreground">/</span>}
              {b.href ? (
                <Link href={b.href} className="truncate text-muted-foreground hover:text-foreground">
                  {b.label}
                </Link>
              ) : (
                <span className="truncate font-medium text-foreground">{b.label}</span>
              )}
            </Fragment>
          ))}
        </nav>
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  );
}
