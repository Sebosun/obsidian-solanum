import { useLayoutEffect, useRef, useState } from "react";
import { CLOCK_DIGITS } from "@/lib/scene/constants";

interface ClockDigitProps {
  char: string;
  /** Width of the cell in ems. */
  width: number;
  reduced: boolean;
}

const ROLL_MS = CLOCK_DIGITS.roll.seconds * 1000;

/** One fixed-width character. When it changes, the old one rolls out and the new one drops in. */
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
    const timer = setTimeout(() => setLeaving(null), ROLL_MS);
    return () => clearTimeout(timer);
  }, [char, reduced]);

  return (
    <span className="solanum-clock-cell" style={{ width: `${width}em` }}>
      {leaving !== null && <span className="solanum-clock-glyph is-out">{leaving}</span>}
      <span
        key={char}
        className={leaving === null ? "solanum-clock-glyph" : "solanum-clock-glyph is-in"}
      >
        {char}
      </span>
    </span>
  );
}
