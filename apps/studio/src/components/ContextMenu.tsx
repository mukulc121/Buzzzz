import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

const EDGE = 8;

type TMenuItem =
  | {
      label: string;
      icon: ReactNode;
      disabled?: boolean;
      danger?: boolean;
      onSelect: () => void;
    }
  | { separator: true };

interface IContextMenu {
  x: number;
  y: number;
  items: TMenuItem[];
  onClose: () => void;
}

export function ContextMenu(props: IContextMenu) {
  const { x, y, items, onClose } = props;
  const menu = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState({ left: x, top: y, ready: false });
  useLayoutEffect(() => {
    const node = menu.current;
    if (!node) return;
    const { width, height } = node.getBoundingClientRect();
    const left = x + width + EDGE > innerWidth ? Math.max(EDGE, innerWidth - width - EDGE) : x;
    const top = y + height + EDGE > innerHeight ? Math.max(EDGE, innerHeight - height - EDGE) : y;
    setPlace({ left, top, ready: true });
  }, [x, y]);
  useEffect(() => {
    if (place.ready)
      menu.current?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')?.focus();
  }, [place.ready]);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !menu.current?.contains(event.target)) onClose();
    };
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", escape, true);
    addEventListener("resize", onClose);
    addEventListener("scroll", onClose, true);
    addEventListener("blur", onClose);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("keydown", escape, true);
      removeEventListener("resize", onClose);
      removeEventListener("scroll", onClose, true);
      removeEventListener("blur", onClose);
    };
  }, [onClose]);
  const move = (event: KeyboardEvent) => {
    const options = [
      ...(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? []),
    ];
    const active = document.activeElement;
    const index = active instanceof HTMLElement ? options.indexOf(active) : -1;
    const next = {
      ArrowDown: index + 1,
      ArrowUp: index - 1 + options.length,
      Home: 0,
      End: options.length - 1,
    }[event.key];
    if (next === undefined || !options.length) return;
    event.preventDefault();
    options[next % options.length]?.focus();
  };
  return createPortal(
    <div
      ref={menu}
      role="menu"
      className="context-menu"
      style={{ left: place.left, top: place.top, visibility: place.ready ? "visible" : "hidden" }}
      onKeyDown={move}
      onContextMenu={(event) => event.preventDefault()}
    >
      {items.map((item, index) =>
        "separator" in item ? (
          <div key={`separator-${index}`} role="separator" className="context-menu-separator" />
        ) : (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            className={item.danger ? "context-menu-item danger" : "context-menu-item"}
            onClick={() => {
              onClose();
              item.onSelect();
            }}
          >
            <span className="context-menu-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ),
      )}
    </div>,
    document.body,
  );
}
