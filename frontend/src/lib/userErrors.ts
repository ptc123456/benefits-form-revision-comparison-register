const MESSAGE_KEYS = ["message", "shortMessage", "reason", "details", "error"] as const;

export function userErrorMessage(error: unknown, fallback = "The request could not be completed. Try again."): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    const value = error as Record<string, unknown>;
    for (const key of MESSAGE_KEYS) {
      const candidate = value[key];
      if (typeof candidate === "string" && candidate.trim()) return candidate;
      if (candidate && typeof candidate === "object") {
        const nested = userErrorMessage(candidate, "");
        if (nested) return nested;
      }
    }
  }
  return fallback;
}
