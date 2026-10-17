const ANCHORS: Record<string, string> = {
  "activity-bar": ".tool-rail",
  "activity-media": '.tool-rail button[data-panel="media"]',
  "activity-device": '.tool-rail button[data-panel="device"]',
  "activity-tools": '.tool-rail button[data-panel="tools"]',
  canvas: ".chart-card",
  "side-panel": ".workspace-sidebar",
  "inspector-tabs": ".inspector-tabs",
  "inspector-selection": '[data-tour="inspector-selection"]',
  "inspector-layers": '[data-tour="inspector-layers"]',
  "inspector-controls": '[data-tour="inspector-controls"]',
  "inspector-preview": '[data-tour="inspector-preview"]',
  "sound-panel": ".sound-panel",
  "animation-panel": ".animation-panel",
  timelines: ".timeline-panel",
  play: '[data-tour="play"]',
  toolbar: ".pattern-header",
};

export function walkthroughAnchor(anchor: string) {
  return ANCHORS[anchor] ?? `[data-tour="${anchor}"]`;
}
