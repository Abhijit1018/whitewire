"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { createExampleProjectAction } from "./actions";

/**
 * Removes the onboarding cliff: the product does nothing until a model key is
 * connected, which is where most trials are lost. This drops a finished board
 * in one click so the value is visible first.
 */
export function ExampleProjectButton() {
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);

  return (
    <form
      action={async () => {
        if (submitting.current) return;
        submitting.current = true;
        setPending(true);
        try {
          await createExampleProjectAction();
        } finally {
          submitting.current = false;
          setPending(false);
        }
      }}
    >
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Building…" : "See an example board"}
      </Button>
    </form>
  );
}
