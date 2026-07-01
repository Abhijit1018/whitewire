"use client";

import { useRef } from "react";
import { setRouteAction } from "./keys-actions";

export function RouteSelect({
  role,
  current,
  keys,
}: {
  role: string;
  current: string;
  keys: { id: string; label: string }[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={setRouteAction} className="flex items-center gap-3">
      <input type="hidden" name="role" value={role} />
      <span className="w-24 text-sm capitalize text-zinc-700">{role}</span>
      <select
        name="keyId"
        defaultValue={current}
        onChange={() => formRef.current?.requestSubmit()}
        className="flex-1 rounded-md border border-zinc-200 px-2 py-1 text-sm"
      >
        <option value="">Use active key</option>
        {keys.map((k) => (
          <option key={k.id} value={k.id}>
            {k.label}
          </option>
        ))}
      </select>
    </form>
  );
}
