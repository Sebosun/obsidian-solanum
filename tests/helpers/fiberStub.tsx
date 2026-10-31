import type { ReactNode } from "react";

export type CanvasMode = "ready" | "loading" | "failing";

/**
 * State of the stand-in for the WebGL canvas, shared with the test that mounts it. In "loading" the
 * canvas suspends forever, in "failing" it throws as a missing WebGL context would, and otherwise
 * it renders a labelled placeholder after recording how it was set up.
 */
export const canvasStub = {
  mode: "ready" as CanvasMode,
  /** Accessible name of the placeholder; when set it replaces the name the scene gives the canvas. */
  label: undefined as string | undefined,
  props: null as Record<string, unknown> | null,
  children: null as ReactNode,
};

const NEVER_LOADS = new Promise<never>(() => {});

export function resetCanvasStub(mode: CanvasMode = "ready", label?: string) {
  canvasStub.mode = mode;
  canvasStub.label = label;
  canvasStub.props = null;
  canvasStub.children = null;
}

interface CanvasProps {
  children?: ReactNode;
  role?: string;
  "aria-labelledby"?: string;
  frameloop?: string;
}

/**
 * The module factory for `vi.mock("@react-three/fiber", ...)`. vi.mock is hoisted above imports, so
 * a test uses it as:
 *
 *   vi.mock("@react-three/fiber", async () => (await import("./helpers/fiberStub")).fiberStub());
 */
export function fiberStub() {
  return {
    Canvas: ({ children, ...props }: CanvasProps) => {
      if (canvasStub.mode === "loading") throw NEVER_LOADS;
      if (canvasStub.mode === "failing") throw new Error("WebGL context unavailable");
      canvasStub.props = props;
      canvasStub.children = children;
      const label = canvasStub.label;
      return (
        <div
          data-testid="canvas"
          role={props.role ?? (label ? "img" : undefined)}
          aria-label={label}
          aria-labelledby={label ? undefined : props["aria-labelledby"]}
        />
      );
    },
  };
}
