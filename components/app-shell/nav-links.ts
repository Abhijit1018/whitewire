import { FolderKanban, FileStack, Settings, UserCircle, type LucideIcon } from "lucide-react";

/** Shared app navigation, used by both the desktop Sidebar and the mobile drawer. */
export const NAV_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Projects", icon: FolderKanban },
  { href: "/artifacts", label: "Artifacts", icon: FileStack },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/account", label: "Account", icon: UserCircle },
];
