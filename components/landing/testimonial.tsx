import { Reveal } from "./motion";

/** NOTE: placeholder testimonial — swap the quote/author for a real one. */
export function Testimonial() {
  return (
    <section className="bg-background px-6 py-24">
      <Reveal className="relative mx-auto max-w-3xl">
        <div className="relative rounded-3xl border border-border bg-card px-8 py-12 shadow-sm sm:px-14">
          <span className="font-display text-6xl leading-none text-brand-accent/40" aria-hidden>
            &ldquo;
          </span>
          <blockquote className="-mt-6 font-display text-2xl font-medium leading-snug text-foreground sm:text-3xl">
            WhiteWire feels like the perfect balance between simplicity and power. It has become our
            team&apos;s go-to space for turning chaos into clarity.
          </blockquote>
          <div className="mt-8 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-full bg-brand-accent text-sm font-semibold text-white">
              SJ
            </span>
            <div>
              <p className="font-medium text-foreground">Sarah J.</p>
              <p className="text-sm text-muted-foreground">Product Designer</p>
            </div>
          </div>

          {/* torn-paper heart sticky */}
          <div className="pointer-events-none absolute -right-4 -top-6 hidden rotate-6 sm:block">
            <div className="grid size-20 place-items-center rounded-md bg-[oklch(0.9_0.05_58)] shadow-lg">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 20s-7-4.4-9.2-8.2C1.2 8.6 2.6 5.5 5.7 5.5c1.9 0 3.2 1.2 3.9 2.3.7-1.1 2-2.3 3.9-2.3 3.1 0 4.5 3.1 2.9 6.3C19 15.6 12 20 12 20Z"
                  fill="none"
                  stroke="oklch(0.55 0.14 40)"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
