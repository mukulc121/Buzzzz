import { useEffect, useRef, useState, type PointerEvent } from "react";

interface IWindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
interface IWindowDrag {
  kind: "move" | "resize";
  x: number;
  y: number;
  bounds: IWindowBounds;
  pointerId: number;
}

function initialBounds(): IWindowBounds {
  const width = Math.min(380, window.innerWidth - 32);
  return {
    width,
    height: Math.min(480, window.innerHeight - 80),
    x: Math.max(16, window.innerWidth - width - 80),
    y: Math.min(80, window.innerHeight / 4),
  };
}

export function useToolWindowBounds() {
  const [bounds, setBounds] = useState(initialBounds);
  const drag = useRef<IWindowDrag | null>(null);
  useEffect(() => {
    const resize = () =>
      setBounds((current) => {
        const width = Math.min(current.width, window.innerWidth - 32);
        const height = Math.min(current.height, window.innerHeight - 32);
        return {
          width,
          height,
          x: Math.max(16, Math.min(current.x, window.innerWidth - width - 16)),
          y: Math.max(16, Math.min(current.y, window.innerHeight - height - 16)),
        };
      });
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  const begin = (kind: IWindowDrag["kind"], event: PointerEvent<HTMLElement>) => {
    if (
      event.button !== 0 ||
      (kind === "move" && event.target instanceof Element && event.target.closest("button"))
    )
      return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { kind, x: event.clientX, y: event.clientY, bounds, pointerId: event.pointerId };
  };
  const move = (event: PointerEvent<HTMLElement>) => {
    const current = drag.current;
    if (!current || event.pointerId !== current.pointerId) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (current.kind === "move")
      setBounds({
        ...current.bounds,
        x: Math.min(
          Math.max(current.bounds.x + dx, 48 - current.bounds.width),
          window.innerWidth - 24,
        ),
        y: Math.min(Math.max(current.bounds.y + dy, 0), window.innerHeight - 24),
      });
    else
      setBounds({
        ...current.bounds,
        width: Math.max(
          Math.min(300, window.innerWidth - 32),
          Math.min(current.bounds.width + dx, window.innerWidth - current.bounds.x - 24),
        ),
        height: Math.max(
          Math.min(220, window.innerHeight - 32),
          Math.min(current.bounds.height + dy, window.innerHeight - current.bounds.y - 24),
        ),
      });
  };
  const end = () => {
    drag.current = null;
  };
  const resizeBy = (width: number, height: number) =>
    setBounds((current) => ({
      ...current,
      width: Math.max(
        Math.min(300, window.innerWidth - 32),
        Math.min(current.width + width, window.innerWidth - current.x - 24),
      ),
      height: Math.max(
        Math.min(220, window.innerHeight - 32),
        Math.min(current.height + height, window.innerHeight - current.y - 24),
      ),
    }));
  return { bounds, begin, move, end, resizeBy };
}
