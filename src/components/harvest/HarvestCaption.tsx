export interface HarvestCaptionAction {
  label: string;
  run(): void;
}

interface HarvestCaptionProps {
  text: string;
  /** One thing the person can do about what the text says, such as clearing filters. */
  action?: HarvestCaptionAction;
}

/** The line of text under a harvest view, with an action beside it when there is one. */
export function HarvestCaption({ text, action }: HarvestCaptionProps) {
  return (
    <p className="solanum-hint solanum-scene-caption">
      {text}
      {action && (
        <>
          {" "}
          <button className="solanum-subtle" onClick={action.run}>
            {action.label}
          </button>
        </>
      )}
    </p>
  );
}
