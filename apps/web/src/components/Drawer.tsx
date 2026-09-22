import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";

type Props = {
  title: ReactNode;
  eyebrow?: string;
  onClose: () => void;
  children: ReactNode;
};

/**
 * Right-hand slide-over. Escape closes it, focus moves in on open and returns
 * to the trigger on close, and Tab is kept inside while it is open.
 */
export function Drawer({ title, eyebrow, onClose, children }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const headingId = useId();

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("[data-autofocus], button, input, select, textarea")?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel.current) {
        return;
      }
      const focusable = [
        ...panel.current.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]"),
      ].filter((node) => !node.hasAttribute("disabled") && node.tabIndex !== -1);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        return;
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="drawer" role="dialog" aria-modal="true" aria-labelledby={headingId} ref={panel}>
        <header className="drawer__head">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <h2 id={headingId}>{title}</h2>
          </div>
          <button type="button" className="btn btn--ghost btn--icon btn--sm" onClick={onClose} aria-label="Close panel">
            <Icon name="close" size={17} />
          </button>
        </header>
        <div className="drawer__body">{children}</div>
      </div>
    </>
  );
}
