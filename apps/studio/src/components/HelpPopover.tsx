import { useEffect, useLayoutEffect, useRef, useState } from "react";

interface IHelpPopover {
  text: string;
  label?: string;
}
interface IHelpPosition {
  top: number;
  left: number;
  width: number;
}

export function HelpPopover(props: IHelpPopover) {
  const { text, label } = props;
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<IHelpPosition | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const bubble = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const bounds = button.current?.getBoundingClientRect();
      if (!bounds) return;
      const width = Math.min(240, window.innerWidth - 16);
      const left = Math.min(
        Math.max(bounds.left + bounds.width / 2 - width / 2, 8),
        window.innerWidth - width - 8,
      );
      setPosition({ top: bounds.bottom + 6, left, width });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        (button.current?.contains(target) || bubble.current?.contains(target))
      )
        return;
      setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <>
      <button
        ref={button}
        type="button"
        className="help-popover-button"
        aria-label={label ? `About ${label}` : "More information"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <svg
          aria-hidden="true"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      </button>
      {open && position && (
        <span ref={bubble} role="tooltip" className="help-popover-bubble" style={position}>
          {text}
        </span>
      )}
    </>
  );
}
