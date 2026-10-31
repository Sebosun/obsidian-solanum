import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

interface SettingsMenuProps {
  onPreferences(): void;
}

export function SettingsMenu({ onPreferences }: SettingsMenuProps) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    container.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  function toggleMenu() {
    setOpen(!open);
  }
  function openPreferences() {
    setOpen(false);
    onPreferences();
  }
  function handleKey(event: KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const items = [
        ...(container.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []),
      ];
      const index = items.findIndex((item) => item === document.activeElement);
      const direction = event.key === "ArrowDown" ? 1 : -1;
      items[(index + direction + items.length) % items.length]?.focus();
      return;
    }
    if (event.key !== "Escape") return;
    event.stopPropagation();
    setOpen(false);
    trigger.current?.focus();
  }

  return (
    <div ref={container} className="solanum-settings-menu" onKeyDown={handleKey}>
      <button
        ref={trigger}
        className="solanum-icon-button"
        aria-label="Open menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggleMenu}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="m9 3 1-1h4l1 3 3 1 3 1v4l-2 2-1 3 1 3-4 2-3-1-3 1-4-2 1-3-1-3-2-2V7l3-1 2-2Z" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="solanum-menu-popover">
          <button role="menuitem" onClick={openPreferences}>
            Preferences
          </button>
        </div>
      )}
    </div>
  );
}
