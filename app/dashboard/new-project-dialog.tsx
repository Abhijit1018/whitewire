"use client";

import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createProjectAction } from "./actions";

export function NewProjectDialog() {
  return (
    <Dialog>
      <DialogTrigger render={<Button />}>New project</DialogTrigger>
      <DialogContent>
        <DialogTitle>New project</DialogTitle>
        <form action={createProjectAction} className="flex flex-col gap-4">
          <Input name="name" placeholder="Project name" autoFocus required />
          <Button type="submit">Create</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
