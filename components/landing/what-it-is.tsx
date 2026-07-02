import { Reveal } from "./motion";

export function WhatItIs() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight">One canvas for the whole idea</h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Sketch a thought, let AI turn it into diagrams, wireframes, specs, and docs — then
          refine together in real time. Everything lives on one infinite canvas.
        </p>
      </Reveal>
      <Reveal className="mt-12" delay={0.1}>
        <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-white p-3 shadow-xl">
          <div className="flex h-72 items-center justify-center rounded-xl bg-dotted-grid">
            <span className="rounded-lg bg-gradient-brand px-4 py-2 text-sm font-medium text-white shadow-lg">
              Your canvas, alive
            </span>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
