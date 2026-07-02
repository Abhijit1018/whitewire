"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderKanban, FileStack, Settings, UserCircle, LogOut } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { signOutAction } from "@/app/auth/actions";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Projects", icon: FolderKanban },
  { href: "/artifacts", label: "Artifacts", icon: FileStack },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/account", label: "Account", icon: UserCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex h-screen w-56 flex-col border-r border-border bg-surface p-4">
      <Link href="/dashboard" className="mb-6 px-1">
        <Logo variant="full" appearance="light" />
      </Link>
      <nav className="flex flex-col gap-1">
        {links.map((l) => {
          const active = pathname === l.href || pathname.startsWith(l.href + "/");
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
  );
}
