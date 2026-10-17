import { useRef, useState, type CSSProperties } from "react";

export function useWorkspaceSize() {
  const [sidebar, setSidebar] = useState(280);
  const [inspector, setInspector] = useState(300);
  const start = useRef(0);
  const style: CSSProperties & Record<string, number | string> = {
    "--sidebar-width": `${sidebar}px`,
    "--inspector-width": `${inspector}px`,
  };
  return {
    sidebar,
    inspector,
    style,
    sideHandle: {
      onStart: () => (start.current = sidebar),
      onResize: (delta: number) => setSidebar(Math.max(200, Math.min(480, start.current + delta))),
    },
    inspectorHandle: {
      onStart: () => (start.current = inspector),
      onResize: (delta: number) =>
        setInspector(Math.max(240, Math.min(460, start.current - delta))),
    },
  };
}
