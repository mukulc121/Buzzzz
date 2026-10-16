import { useRef, type PointerEvent } from "react";

interface IResizeHandle {
  label: string;
  orientation?: "vertical" | "horizontal";
  onStart: () => void;
  onResize: (delta: number) => void;
  position?: number | string;
}

export function ResizeHandle(props: IResizeHandle) {
  const { label, orientation = "vertical", onStart, onResize, position } = props;
  const origin = useRef<number | null>(null);
  const coordinate = (event: PointerEvent) =>
    orientation === "vertical" ? event.clientX : event.clientY;
  const finish = (event: PointerEvent<HTMLDivElement>) => {
    origin.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return (
    <div
      className="resize-handle"
      data-orientation={orientation}
      data-positioned={position === undefined ? undefined : true}
      style={position === undefined ? undefined : { left: position }}
      role="separator"
      aria-label={label}
      aria-orientation={orientation}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        origin.current = coordinate(event);
        event.currentTarget.setPointerCapture(event.pointerId);
        onStart();
      }}
      onPointerMove={(event) => {
        if (origin.current !== null) onResize(coordinate(event) - origin.current);
      }}
      onPointerUp={finish}
      onPointerCancel={finish}
      onLostPointerCapture={() => (origin.current = null)}
    >
      <span className="resize-grip" />
    </div>
  );
}
