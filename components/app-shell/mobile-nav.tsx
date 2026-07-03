"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { signOutAction } from "@/app/auth/actions";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "./nav-links";

/** Hamburger + slide-in drawer for app navigation on small screens (hidden on md+). */
export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className="-ml-1 grid size-9 place-items-center rounded-lg text-foreground hover:bg-muted"
      >
        <Menu className="size-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 max-w-[80%] flex-col border-r border-border bg-surface p-4 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <Logo variant="full" appearance="light" />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="grid size-9 place-items-center rounded-lg hover:bg-muted"
              >
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((l) => {
                const active = pathname === l.href || pathname.startsWith(l.href + "/");
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-muted font-medium text-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <l.icon className="size-4" />
                    {l.label}
                  </Link>
                );
              })}
            </nav>
            <form action={signOutAction} className="mt-auto">
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <LogOut className="size-4" />
                Sign out
              </button>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
