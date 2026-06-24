import { useCallback, useState } from 'react';
import { usePersistentState } from './usePersistentState';

/**
 * A persisted setting that a one-time cross-app URL handoff can override for the
 * current session **without overwriting the user's saved value**.
 *
 * The cross-app function handoff ({@link ./functionHandoff}) seeds the
 * destination app's function from `?fn=…` so the two viewers (Complex Particles
 * ↔ Plane Transform) show the same function. But the function is itself a
 * persisted setting: calling the persisted setter directly would clobber the
 * destination's *own* saved choice, and then a later visit (no `?fn=`) would show
 * the handed-off function instead of the user's. This hook splits the two:
 *
 *  - `value` — the live view, seeded from the saved value, then overridable by a
 *    handoff (drop-in for the old persisted value).
 *  - `set` — the user-facing setter: updates the view **and** persists (drop-in
 *    for the old setter, so deliberate in-app changes still survive a reload).
 *  - `seed` — a session-only override: updates the view, **never** persists.
 *
 * So a handoff is a transient view override (the saved choice is preserved and
 * returns on the next plain visit), while a deliberate in-app change persists as
 * before. Like {@link usePersistentState}, the hooks are called unconditionally,
 * so React's hook order stays stable.
 */
export function useHandoffState<T>(
  key: string | null,
  initial: T,
): [T, (v: T) => void, (v: T) => void] {
  const [saved, setSaved] = usePersistentState(key, initial);
  // The view starts equal to the saved value (read synchronously from storage by
  // usePersistentState's initializer) and only diverges when `seed` is called.
  const [view, setView] = useState<T>(saved);
  const set = useCallback(
    (v: T) => {
      setView(v);
      setSaved(v);
    },
    [setSaved],
  );
  return [view, set, setView];
}
