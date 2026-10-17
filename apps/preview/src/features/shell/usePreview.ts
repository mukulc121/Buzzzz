import { createContext, useContext } from "react";
import type { Theme } from "../../theme/colors";
import type { usePreviewSession } from "../preview/usePreviewSession";

interface IPreviewContext {
  t: Theme;
  session: ReturnType<typeof usePreviewSession>;
  fullscreen: boolean;
  setFullscreen: (value: boolean) => void;
}
export const PreviewContext = createContext<IPreviewContext | null>(null);
export function usePreview() {
  const context = useContext(PreviewContext);
  if (!context) throw new Error("PreviewProvider is missing.");
  return context;
}
