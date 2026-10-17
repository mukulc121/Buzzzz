import { createPortal } from "react-dom";
import { ToolIcon } from "../../components/ToolIcon";
import { ToolBody } from "./ToolBody";
import { TOOLS } from "./catalog";
import { useToolWindowBounds } from "./useToolWindowBounds";
import type { IToolSession } from "./model";
import type { useToolWorkspace } from "./useToolWorkspace";

interface IFloatingToolWindow {
  tools: ReturnType<typeof useToolWorkspace>;
  session: IToolSession;
  onDock: () => void;
}

export function FloatingToolWindow(props: IFloatingToolWindow) {
  const { tools, session, onDock } = props;
  const geometry = useToolWindowBounds();
  const tool = TOOLS.find((item) => item.id === tools.floating);
  if (!tool) return null;
  return createPortal(
    <section
      className="floating-tool-window"
      role="dialog"
      aria-label={`${tool.name} tool window`}
      style={{
        left: geometry.bounds.x,
        top: geometry.bounds.y,
        width: geometry.bounds.width,
        height: geometry.bounds.height,
      }}
      onPointerMove={geometry.move}
      onPointerUp={geometry.end}
      onPointerCancel={geometry.end}
      onLostPointerCapture={geometry.end}
    >
      <header onPointerDown={(event) => geometry.begin("move", event)}>
        <h2>{tool.name}</h2>
        <div>
          <button
            className="icon"
            aria-label="Dock to panel"
            title="Dock to panel"
            onClick={onDock}
          >
            <ToolIcon name="dock" size={16} />
          </button>
          <button
            className="icon"
            aria-label="Close window"
            title="Close window"
            onClick={tools.closeWindow}
          >
            <ToolIcon name="close" size={16} />
          </button>
        </div>
      </header>
      <div className="floating-tool-body">
        <ToolBody key={tool.id} tool={tool.id} session={session} />
      </div>
      <div
        className="floating-tool-resizer"
        role="separator"
        aria-label="Resize window"
        aria-orientation="horizontal"
        aria-valuenow={Math.round(geometry.bounds.height)}
        aria-valuemin={Math.min(220, window.innerHeight - 32)}
        aria-valuemax={window.innerHeight - 24}
        tabIndex={0}
        onPointerDown={(event) => geometry.begin("resize", event)}
        onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
          event.preventDefault();
          const step = event.shiftKey ? 50 : 10;
          geometry.resizeBy(
            event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0,
            event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0,
          );
        }}
      />
    </section>,
    document.body,
  );
}
