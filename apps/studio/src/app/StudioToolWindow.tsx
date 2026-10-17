import { FloatingToolWindow } from "../features/tools/FloatingToolWindow";
import { toolBindings } from "./toolBindings";
import type { Studio } from "./useStudio";

interface IStudioToolWindow {
  studio: Studio;
}

export function StudioToolWindow(props: IStudioToolWindow) {
  const { studio } = props;
  return (
    <FloatingToolWindow
      tools={studio.tools}
      session={toolBindings(studio)}
      onDock={() => {
        studio.tools.dock();
        studio.setPanel("tools");
      }}
    />
  );
}
