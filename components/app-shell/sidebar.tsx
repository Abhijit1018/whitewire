import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

const links = [
  { href: "/dashboard", label: "Projects" },
  { href: "/artifacts", label: "Artifacts" },
  { href: "/settings", label: "Settings" },
];

export function Sidebar() {
  return (
    <aside className="flex h-screen w-56 flex-col border-r p-4">
      <Link href="/dashboard" className="mb-6 text-xl font-bold">
        WhiteWire
      </Link>
      <nav className="flex flex-col gap-1">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="rounded px-3 py-2 hover:bg-muted">
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto">
        <UserButton />
      </div>
    </aside>
  );
}
