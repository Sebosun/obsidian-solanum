import { useLayoutEffect, useRef, useState } from "react";
import { CLOCK_DIGITS } from "@/lib/scene/constants";

interface ClockDigitProps {
  char: string;
  /** Width of the cell in ems. */
  width: number;
  reduced: boolean;
}

const FLIP_MS = CLOCK_DIGITS.flip.seconds * 1000;

/**
 * One fixed-width character. When it changes it flips like a flip clock's: the old top half folds
 * down over the new digit, then the new bottom half drops into place over the old one.
 */
export function ClockDigit({ char, width, reduced }: ClockDigitProps) {
  const shown = useRef(char);
  const [leaving, setLeaving] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (shown.current === char) return;
    const previous = shown.current;
    shown.current = char;
    if (reduced) {
      setLeaving(null);
      return;
    }
    setLeaving(previous);
    const timer = setTimeout(() => setLeaving(null), FLIP_MS);
    return () => clearTimeout(timer);
  }, [char, reduced]);

  return (
    <span className="solanum-clock-cell" style={{ width: `${width}em` }}>
      {leaving === null ? (
        <span className="solanum-clock-glyph">{char}</span>
      ) : (
        <span key={char} className="solanum-flip">
          {/* Behind: the new digit's top, and the old digit's bottom until the new one covers it. */}
          <span className="solanum-flip-half is-top is-static">{char}</span>
          <span className="solanum-flip-half is-bottom is-static">{leaving}</span>
          {/* In front: the old top folds away, then the new bottom unfolds. */}
          <span className="solanum-flip-half is-top is-leaf">{leaving}</span>
          <span className="solanum-flip-half is-bottom is-leaf">{char}</span>
        </span>
      )}
    </span>
  );
}
