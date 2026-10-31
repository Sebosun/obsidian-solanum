export type ControlIconKind = "pause" | "play" | "stop" | "skip";

interface ControlIconProps {
  kind: ControlIconKind;
}

const SHAPES: Record<ControlIconKind, string> = {
  pause: "M8 5v14M16 5v14",
  play: "M8 5.5v13l10-6.5Z",
  stop: "M7 7h10v10H7Z",
  skip: "M6 6l9 6-9 6ZM18 6v12",
};

export function ControlIcon({ kind }: ControlIconProps) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={SHAPES[kind]} />
    </svg>
  );
}
