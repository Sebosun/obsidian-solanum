import { useEffect, useState, type RefObject } from "react";

/** Whether the element is scrolled into view; assumes yes where observers are unavailable. */
export function useOnScreen(target: RefObject<HTMLElement | null>): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (typeof IntersectionObserver !== "function" || !target.current) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(target.current);
    return () => observer.disconnect();
  }, [target]);
  return visible;
}
