import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";

type Props = {
  title: ReactNode;
  eyebrow?: string;
  onClose: () => void;
  children: ReactNode;
};

const FOCUSABLE = "button, [href], input, select, textarea, [tabindex]";

/**
 * Right-hand slide-over. Escape closes it, focus moves in on open and returns
 * to the trigger on close, and Tab is kept inside while it is open.
 *
 * Both effects run once per mount: `onClose` is read through a ref so a caller
 * passing an inline arrow cannot re-run them. Re-running would restore focus to
 * the trigger behind the drawer on every parent render, which made typing in a
 * drawer form impossible.
 */
export function Drawer({ title, eyebrow, onClose, children }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  const headingId = useId();

  close.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const preferred = panel.current?.querySelector<HTMLElement>("[data-autofocus]");
    (preferred ?? panel.current?.querySelector<HTMLElement>(FOCUSABLE))?.focus();

    return () => {
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close.current();
        return;
      }
      if (event.key !== "Tab" || !panel.current) {
        return;
      }
      const focusable = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (node) => !node.hasAttribute("disabled") && node.tabIndex !== -1,
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        return;
      }
      // Pull focus back if it ever escaped the panel, then wrap at the ends.
      if (!panel.current.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <div className="scrim" onClick={() => close.current()} />
      <div className="drawer" role="dialog" aria-modal="true" aria-labelledby={headingId} ref={panel}>
        <header className="drawer__head">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            <h2 id={headingId}>{title}</h2>
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--icon btn--sm"
            onClick={() => close.current()}
            aria-label="Close panel"
          >
            <Icon name="close" size={17} />
          </button>
        </header>
        <div className="drawer__body">{children}</div>
      </div>
    </>
  );
}
