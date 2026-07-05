"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const STORAGE_KEY = "whitewire:onboarded:v1";

type Step = { title: string; body: string; emoji: string };

const STEPS: Step[] = [
  {
    emoji: "🧩",
    title: "Welcome to WhiteWire",
    body: "An AI-native canvas where an idea becomes a connected board — concepts, wireframes, schemas, APIs, ER diagrams, and docs. Here's the 30-second tour.",
  },
  {
    emoji: "⌨️",
    title: "Generate a board",
    body: "Type an idea in the command bar at the bottom and hit Generate. The AI builds a set of connected concept nodes, auto-laid-out for you.",
  },
  {
    emoji: "🌿",
    title: "Expand & attach artifacts",
    body: "Select any node to Expand it into children, or generate linked artifacts — Schema · API · ORM · ERD · UI · Docs. ERDs render as real Mermaid diagrams.",
  },
  {
    emoji: "🔑",
    title: "Bring your own LLM",
    body: "Add a provider key in Settings — OpenAI, Groq, Anthropic, Google, or a local runtime. Keys are encrypted at rest. Pick a preset and the base URL fills itself.",
  },
];

/** First-run guided tour. Shows once per browser; dismissal persists to localStorage. */
export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch {
      // localStorage unavailable (private mode) — skip the tour silently.
    }
  }, []);

  function close() {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore write failures
    }
  }

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-title"
        >
          <button
            aria-label="Skip tour"
            onClick={close}
            className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl"
          >
            <div className="mb-3 text-3xl" aria-hidden>
              {current.emoji}
            </div>
            <h2 id="onboarding-title" className="text-lg font-semibold text-foreground">
              {current.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{current.body}</p>

            <div className="mt-6 flex items-center justify-between">
              <div className="flex gap-1.5" role="tablist" aria-label="Tour progress">
                {STEPS.map((_, i) => (
                  <span
                    key={i}
                    aria-current={i === step}
                    className={`h-1.5 rounded-full transition-all ${
                      i === step ? "w-5 bg-primary" : "w-1.5 bg-border"
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <button
                    onClick={() => setStep((s) => s - 1)}
                    className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition hover:text-foreground active:opacity-60"
                  >
                    Back
                  </button>
                )}
                {isLast ? (
                  <button
                    onClick={close}
                    className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-95"
                  >
                    Get started
                  </button>
                ) : (
                  <button
                    onClick={() => setStep((s) => s + 1)}
                    className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 active:scale-95"
                  >
                    Next
                  </button>
                )}
              </div>
            </div>

            {!isLast && (
              <button
                onClick={close}
                className="absolute right-4 top-4 text-xs text-muted-foreground transition hover:text-foreground active:opacity-60"
              >
                Skip
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
