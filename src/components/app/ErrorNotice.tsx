interface ErrorNoticeProps {
  message: string;
  onDismiss(): void;
}

export function ErrorNotice({ message, onDismiss }: ErrorNoticeProps) {
  return (
    <div role="alert" className="solanum-error">
      {message}
      <button onClick={onDismiss} aria-label="Dismiss error">
        ×
      </button>
    </div>
  );
}
