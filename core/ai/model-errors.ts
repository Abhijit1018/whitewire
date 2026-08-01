/** Configuration problems the user can fix in Settings, as opposed to transient failures. */
export type ModelErrorCode = "no_key" | "no_model";

export class ModelConfigError extends Error {
  readonly code: ModelErrorCode;

  constructor(code: ModelErrorCode, message: string) {
    super(message);
    this.name = "ModelConfigError";
    this.code = code;
  }
}

export type ActionFailure = { error: string; code?: ModelErrorCode | "failed" };

/**
 * Normalizes a thrown value into a serializable failure a Server Action can
 * return, so the client can route config problems to a sticky notice without
 * pattern-matching on English prose.
 */
export function toActionFailure(e: unknown, fallback: string): ActionFailure {
  if (e instanceof ModelConfigError) return { error: e.message, code: e.code };
  const message = e instanceof Error && e.message ? e.message : fallback;
  return { error: message, code: "failed" };
}
