import { useEffect, useRef, useState } from "react";
import { Monitor, X } from "../components/icons";

const KEY = "buzzzz.mobile-notice-dismissed";
function wasDismissed() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function MobileNotice() {
  const [narrow, setNarrow] = useState(false);
  const [dismissed, setDismissed] = useState(wasDismissed);
  const notice = useRef<HTMLDivElement>(null);
  const visible = narrow && !dismissed;
  useEffect(() => {
    const query = matchMedia("(max-width: 768px)");
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!visible || !notice.current) return;
    const element = notice.current;
    const measure = () =>
      document.documentElement.style.setProperty(
        "--mobile-notice-space",
        `${element.offsetHeight + 16}px`,
      );
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--mobile-notice-space");
    };
  }, [visible]);
  if (!visible) return null;
  return (
    <div ref={notice} className="mobile-notice" role="status">
      <Monitor />
      <p>
        Buzzzz Studio is built for a big screen - open it on a desktop computer for the full editor.
      </p>
      <button
        className="icon"
        aria-label="Dismiss"
        onClick={() => {
          setDismissed(true);
          try {
            localStorage.setItem(KEY, "1");
          } catch {
            return;
          }
        }}
      >
        <X />
      </button>
    </div>
  );
}
