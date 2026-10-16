import type { Pattern } from "@buzzzz/core";
import type { IAudioGenerationOptions } from "../audio/model";

export interface IAnimationKeyframe {
  time: number;
  start: number[];
  end?: number[];
  hold: boolean;
  incoming?: { x: number[]; y: number[] };
  outgoing?: { x: number[]; y: number[] };
  spatialIn?: number[];
  spatialOut?: number[];
}
export interface IAnimationChannel {
  value: number[];
  keys: IAnimationKeyframe[];
}
export interface IAnimationNode {
  parent: number | null;
  clocks: { start: number; end: number; offset: number; stretch: number }[];
  position: IAnimationChannel;
  positionX?: IAnimationChannel;
  positionY?: IAnimationChannel;
  anchor: IAnimationChannel;
  scale: IAnimationChannel;
  rotation: IAnimationChannel;
  opacity: IAnimationChannel;
  width: number;
  height: number;
  visible: boolean;
}
export interface IAnimationDocument {
  data: Record<string, unknown>;
  frameRate: number;
  inFrame: number;
  durationMs: number;
  width: number;
  height: number;
  nodes: IAnimationNode[];
  warnings: string[];
}
export interface IAnimationFrame {
  timeMs: number;
  energy: number;
  velocity: number;
  acceleration: number;
  directionChange: number;
  impulse: number;
  positionX: number;
  positionY: number;
  scale: number;
  rotation: number;
  opacity: number;
}
export type AnimationMetric = keyof Omit<IAnimationFrame, "timeMs">;
export interface IAnimationAnalysis {
  durationMs: number;
  frameMs: number;
  frames: IAnimationFrame[];
  impacts: { timeMs: number; strength: number; momentum: number }[];
  warnings: string[];
}
export interface IAnimationCandidate {
  id: "hybrid" | "energy" | "kinematic" | "impulse" | "channel";
  label: string;
  description: string;
  approximate: boolean;
  pattern: Pattern;
  pointCount: number;
  eventCount: number;
}
export interface IAnimationGenerationOptions extends IAudioGenerationOptions {
  smoothingMs: number;
  intensityChannel: AnimationMetric;
  frequencyChannel: AnimationMetric;
  gain?: number;
  threshold?: number;
  minGapMs?: number;
  freqFollow?: number;
}
export interface IAnimationAnalysisRequest {
  document: IAnimationDocument;
  frameMs: number;
}
export type AnimationAnalysisResponse = { analysis: IAnimationAnalysis } | { error: string };
