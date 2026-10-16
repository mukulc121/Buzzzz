import { useState } from "react";
import type { ToolId } from "./model";

export function useToolWorkspace() {
  const [active, setActive] = useState<ToolId | null>(null);
  const [floating, setFloating] = useState<ToolId | null>(null);
  return {
    active,
    setActive,
    floating,
    popOut: (id: ToolId) => {
      setFloating(id);
      setActive(null);
    },
    dock: () => {
      setActive(floating);
      setFloating(null);
    },
    closeWindow: () => setFloating(null),
  };
}
