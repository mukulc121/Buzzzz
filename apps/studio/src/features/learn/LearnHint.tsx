import { useEffect, useLayoutEffect, useState } from "react";
import { LearnIcon } from "./LearnIcon";

interface ILearnHint {
  onClose: () => void;
}
export function LearnHint(props: ILearnHint) {
  const { onClose } = props;
  const [position, setPosition] = useState<{
    width: number;
    left: number;
    bottom: number;
    arrowBottom: number;
  } | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const anchor = [...document.querySelectorAll(".tool-rail button")].find(
        (element) => element.textContent?.trim() === "Learn",
      );
      if (!anchor) return;
      const bounds = anchor.getBoundingClientRect();
      const width = Math.min(268, innerWidth - 16);
      setPosition({
        width,
        left: Math.min(bounds.right + 12, innerWidth - width - 8),
        bottom: Math.max(innerHeight - bounds.bottom, 8),
        arrowBottom: innerHeight - bounds.top - bounds.height / 2 - 5,
      });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [onClose]);
  if (!position) return null;
  return (
    <>
      <aside
        className="learn-hint"
        style={{ width: position.width, left: position.left, bottom: position.bottom }}
        role="status"
        aria-live="polite"
      >
        <header>
          <LearnIcon name="learn" size={16} />
          <p>The walkthroughs stay here</p>
        </header>
        <p>
          Open Learn at the bottom of the rail whenever you want them back - the documentation is in
          there too.
        </p>
        <footer>
          <button type="button" onClick={onClose}>
            Got it
          </button>
        </footer>
      </aside>
      <span
        className="learn-hint-arrow"
        style={{ left: position.left - 5, bottom: position.arrowBottom }}
        aria-hidden="true"
      />
    </>
  );
}
