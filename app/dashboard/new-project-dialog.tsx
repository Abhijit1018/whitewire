"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createProjectAction } from "./actions";
import { PLUGINS } from "@/core/plugins/registry";
import { cn } from "@/lib/utils";

const TEMPLATES = [
  { id: "blank", name: "Blank canvas", icon: "▢" },
  ...PLUGINS.map((p) => ({ id: p.id, name: p.name, icon: p.icon })),
];

export function NewProjectDialog() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [template, setTemplate] = useState("blank");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>New project</DialogTrigger>
      <DialogContent>
        <DialogTitle>New project</DialogTitle>
        <form
          action={async (formData) => {
            if (pending) return;
            setPending(true);
            try {
              await createProjectAction(formData);
              setOpen(false);
            } finally {
              setPending(false);
            }
          }}
          className="flex flex-col gap-4"
        >
          <Input name="name" placeholder="Project name" autoFocus required disabled={pending} />

          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">Start from</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplate(t.id)}
                  disabled={pending}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-colors active:scale-[0.98]",
                    template === t.id
                      ? "border-brand-accent bg-brand-accent/10 text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  <span aria-hidden>{t.icon}</span>
                  <span className="truncate">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          <input type="hidden" name="template" value={template} />
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
