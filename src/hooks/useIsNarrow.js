import { useEffect, useState } from 'react';

// True whenever the viewport is at or below `breakpoint` px wide — used
// to switch a couple of screens (Meal Plan's grid, mainly) to a
// stacked, phone-friendly layout instead of squeezing a wide table
// into a narrow viewport. Backed by matchMedia so it also reacts to a
// phone/tablet being rotated or a browser window being resized, not
// just the size at first render.
export function useIsNarrow(breakpoint = 640) {
  const [isNarrow, setIsNarrow] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= breakpoint;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handleChange = (e) => setIsNarrow(e.matches);
    setIsNarrow(mql.matches);
    if (mql.addEventListener) mql.addEventListener('change', handleChange);
    else mql.addListener(handleChange); // older Safari
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', handleChange);
      else mql.removeListener(handleChange);
    };
  }, [breakpoint]);

  return isNarrow;
}
