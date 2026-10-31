interface CloseIconProps {
  /** Width and height in pixels. */
  size: number;
}

/** A small cross, for dismissing or clearing; drawn in the colour of the text around it. */
export function CloseIcon({ size }: CloseIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true">
      <path d="M2 2l6 6M8 2 2 8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
