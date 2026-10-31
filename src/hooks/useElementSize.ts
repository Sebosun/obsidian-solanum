import { useLayoutEffect, useState, type RefObject } from "react";

export interface ElementSize {
  width: number;
  height: number;
}

const UNKNOWN: ElementSize = { width: 0, height: 0 };

/** The element's size in pixels, kept current as it is resized; zero until it can be measured. */
export function useElementSize(ref: RefObject<HTMLElement | null>): ElementSize {
  const [size, setSize] = useState<ElementSize>(UNKNOWN);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    function measure() {
      const box = element!.getBoundingClientRect();
      setSize((previous) =>
        previous.width === box.width && previous.height === box.height
          ? previous
          : { width: box.width, height: box.height },
      );
    }
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}
