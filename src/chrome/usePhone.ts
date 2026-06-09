import { useEffect, useState } from 'react';

/**
 * True below the 740px phone breakpoint (DESIGN-SPEC §6); tracks resizes.
 * The workspace re-chromes on this: stacked view cards, bottom dock,
 * bottom-sheet panels.
 */
export function usePhone(): boolean {
  const [phone, setPhone] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 740px)').matches
  );
  useEffect(() => {
    const m = window.matchMedia('(max-width: 740px)');
    const h = (e: MediaQueryListEvent) => setPhone(e.matches);
    m.addEventListener('change', h);
    return () => m.removeEventListener('change', h);
  }, []);
  return phone;
}
