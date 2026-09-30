"use client";

import { useEffect, useState } from "react";

/** Layout size of an element (transforms ignored), kept up to date; null while unmounted. */
export function useElementSize(element: HTMLElement | null): { width: number; height: number } | null {
  const [size, setSize] = useState<{ element: HTMLElement; width: number; height: number } | null>(null);
  useEffect(() => {
    if (!element) return;
    // The observer reports the initial size too.
    const observer = new ResizeObserver(() =>
      setSize({ element, width: element.offsetWidth, height: element.offsetHeight }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return size && size.element === element ? size : null;
}
