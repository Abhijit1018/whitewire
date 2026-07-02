"use client";

import Link from "next/link";
import { motion, useScroll, useMotionValueEvent } from "motion/react";
import { useState } from "react";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
];

export function LandingNav({ signedIn }: { signedIn: boolean }) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 8));

  return (
    <motion.header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors",
        scrolled ? "border-b border-border bg-white/80 backdrop-blur-md" : "bg-transparent"
      )}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" aria-label="WhiteWire home">
          <Logo variant="full" appearance="light" />
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-muted-foreground hover:text-foreground">
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {signedIn ? (
            <Link
              href="/dashboard"
              className={cn(buttonVariants({ size: "lg" }), "bg-gradient-brand text-white hover:opacity-90")}
            >
              Open WhiteWire
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "hidden sm:inline-flex")}
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className={cn(buttonVariants({ size: "lg" }), "bg-gradient-brand text-white hover:opacity-90")}
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>
    </motion.header>
  );
}
