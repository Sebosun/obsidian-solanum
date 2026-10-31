import type { ReactNode } from "react";

interface SrLabelProps {
  id: string;
  children: ReactNode;
}

/**
 * The accessible name of something that is not a control, kept as hidden text and referenced with
 * `aria-labelledby`. Obsidian shows every `aria-label` as a hover tooltip, so names that nobody
 * needs to read in a tooltip, such as a 3D scene's, must not use that attribute.
 */
export function SrLabel({ id, children }: SrLabelProps) {
  return (
    <span id={id} className="sol:sr-only">
      {children}
    </span>
  );
}
