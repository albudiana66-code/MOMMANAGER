// Returns '' rather than a stringified object when no usable message can be
// found, so every call site's `getErrorMessage(err) || fallback` pattern
// falls back to a proper translated message instead of leaking something
// like "[object Object]" into a toast (e.g. a Supabase/RevenueCat rejection
// whose shape doesn't carry a string `.message`).
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const message = (err as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return '';
}
