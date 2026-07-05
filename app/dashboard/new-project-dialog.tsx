"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createProjectAction } from "./actions";

export function NewProjectDialog() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
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
          <Button type="submit" disabled={pending}>
            {pending ? "Creating…" : "Create"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
