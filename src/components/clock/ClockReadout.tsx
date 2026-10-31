import type { CSSProperties } from "react";
import { ClockDigit } from "@/components/clock/ClockDigit";
import { clockCells } from "@/lib/scene/clockBoard";

interface ClockReadoutProps {
  text: string;
  reduced: boolean;
  style?: CSSProperties;
}

/** The time as a row of fixed-width cells, so no digit's width ever shifts the others. */
export function ClockReadout({ text, reduced, style }: ClockReadoutProps) {
  return (
    <div className="solanum-clock-readout" aria-hidden="true" style={style}>
      {clockCells(text).map((cell, index) => (
        <ClockDigit key={index} char={cell.char} width={cell.width} reduced={reduced} />
      ))}
    </div>
  );
}
