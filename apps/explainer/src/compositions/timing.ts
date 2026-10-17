import vo from "../data/vo.json";
import { TitleScene } from "../scenes/TitleScene";
import { PiecesScene } from "../scenes/PiecesScene";
import { PatternScene } from "../scenes/PatternScene";
import { TriggerScene } from "../scenes/TriggerScene";
import { LiveLoopScene } from "../scenes/LiveLoopScene";
import { PairingScene } from "../scenes/PairingScene";
import { ShipScene } from "../scenes/ShipScene";
import { OutroScene } from "../scenes/OutroScene";
import { WorkspaceScene } from "../scenes/WorkspaceScene";
import { AudioScene } from "../scenes/AudioScene";
import { AnimationScene } from "../scenes/AnimationScene";
import { ToolsScene } from "../scenes/ToolsScene";
import { ProjectsScene } from "../scenes/ProjectsScene";
import { LibraryScene } from "../scenes/LibraryScene";
import { PreviewScene } from "../scenes/PreviewScene";

const SCENES = [
  { Component: TitleScene, minimum: 110 },
  { Component: ProjectsScene, minimum: 230 },
  { Component: WorkspaceScene, minimum: 250 },
  { Component: PatternScene, minimum: 230 },
  { Component: LibraryScene, minimum: 230 },
  { Component: AudioScene, minimum: 250 },
  { Component: AnimationScene, minimum: 250 },
  { Component: ToolsScene, minimum: 230 },
  { Component: TriggerScene, minimum: 230 },
  { Component: LiveLoopScene, minimum: 320 },
  { Component: PreviewScene, minimum: 230 },
  { Component: PairingScene, minimum: 200 },
  { Component: ShipScene, minimum: 210 },
  { Component: PiecesScene, minimum: 210 },
  { Component: OutroScene, minimum: 110 },
];
export const LEAD = 12;
const durations = SCENES.map((scene, i) =>
  Math.max(scene.minimum, LEAD + Math.ceil(vo[i] * 30) + 24),
);
export const TOTAL = durations.reduce((sum, duration) => sum + duration, 0);
export const TIMELINE = SCENES.map(({ Component }, i) => ({
  Component,
  duration: durations[i],
  from: durations.slice(0, i).reduce((sum, duration) => sum + duration, 0),
}));
