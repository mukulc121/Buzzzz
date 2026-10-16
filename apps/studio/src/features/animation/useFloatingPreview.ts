import {
  useEffect,
  useCallback,
  useRef,
  useState,
  type PointerEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";

interface IFloatingPreview {
  shell: RefObject<HTMLElement | null>;
  enabled: boolean;
}
export function useFloatingPreview(props: IFloatingPreview) {
  const { shell, enabled } = props;
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const moveTo = useCallback(
    (left: number, top: number) => {
      const rect = shell.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition({
        left: Math.max(8, Math.min(window.innerWidth - rect.width - 8, left)),
        top: Math.max(8, Math.min(window.innerHeight - rect.height - 8, top)),
      });
    },
    [shell],
  );
  useEffect(() => {
    drag.current = null;
    if (!enabled) return;
    const constrain = () => {
      const rect = shell.current?.getBoundingClientRect();
      if (rect) moveTo(rect.left, rect.top);
    };
    window.addEventListener("resize", constrain);
    return () => window.removeEventListener("resize", constrain);
  }, [enabled, shell, moveTo]);
  return {
    position: enabled ? (position ?? undefined) : undefined,
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (!enabled || event.button !== 0) return;
      const rect = shell.current?.getBoundingClientRect();
      if (!rect) return;
      event.preventDefault();
      drag.current = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const start = drag.current;
      if (start) moveTo(start.left + event.clientX - start.x, start.top + event.clientY - start.y);
    },
    onPointerUp: () => {
      drag.current = null;
    },
    onPointerCancel: () => {
      drag.current = null;
    },
    onLostPointerCapture: () => {
      drag.current = null;
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (!enabled) return;
      const rect = shell.current?.getBoundingClientRect();
      if (!rect || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
      event.preventDefault();
      moveTo(
        rect.left + (event.key === "ArrowLeft" ? -10 : event.key === "ArrowRight" ? 10 : 0),
        rect.top + (event.key === "ArrowUp" ? -10 : event.key === "ArrowDown" ? 10 : 0),
      );
    },
  };
}
