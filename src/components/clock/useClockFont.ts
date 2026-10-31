import { useLayoutEffect, type RefObject } from "react";
import fontUrl from "@assets/fonts/bricolage-grotesque-digits.woff2";

export const CLOCK_FONT_STYLE_ID = "solanum-clock-font";

/** The clock's own typeface, bundled into the plugin as a data URL: nothing is fetched. */
const FONT_FACE = `@font-face{font-family:"Solanum Clock";font-weight:700;font-style:normal;font-display:block;src:url(${fontUrl}) format("woff2")}`;

/** How many clocks are using the typeface in each document (a popout window has its own). */
const users = new WeakMap<Document, number>();

/**
 * Makes the clock's typeface available to the document the element is in. One style element is
 * shared by every clock there, added with the first and removed with the last.
 */
export function useClockFont(target: RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    const doc = target.current?.ownerDocument;
    if (!doc) return;
    const count = users.get(doc) ?? 0;
    users.set(doc, count + 1);
    if (count === 0) {
      const style = doc.createElement("style");
      style.id = CLOCK_FONT_STYLE_ID;
      style.textContent = FONT_FACE;
      doc.head.appendChild(style);
    }
    return () => {
      const remaining = (users.get(doc) ?? 1) - 1;
      users.set(doc, remaining);
      if (remaining === 0) doc.getElementById(CLOCK_FONT_STYLE_ID)?.remove();
    };
  }, [target]);
}
