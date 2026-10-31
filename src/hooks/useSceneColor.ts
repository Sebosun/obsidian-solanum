import { useEffect, useState, type RefObject } from "react";

export function useSceneColor(container: RefObject<HTMLElement | null>): string {
  const [color, setColor] = useState("#cbb89b");
  useEffect(() => {
    function updateColor() {
      if (!container.current) return;
      const value = getComputedStyle(container.current).getPropertyValue("--text-normal").trim();
      if (value) setColor(value);
    }
    updateColor();
    const observer = new MutationObserver(updateColor);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class", "style"] });
    return () => observer.disconnect();
  }, [container]);
  return color;
}
