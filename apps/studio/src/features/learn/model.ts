import type { Alignment, Side } from "driver.js";

export interface IWalkthroughStep {
  anchor: string;
  side: Side;
  align: Alignment;
  title: string;
  body: string;
  prepare?: "media" | "device" | "tools" | "inspector" | "sound" | "animation" | "timeline";
}
export interface IWalkthrough {
  id: string;
  title: string;
  blurb: string;
  tone: "haptics" | "device" | "audio" | "animation";
  steps: readonly IWalkthroughStep[];
}
