import type { Pattern } from "@buzzzz/core";

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
  acceleration: number;
  transient: number;
  positionRate: number;
  scaleRate: number;
  rotationRate: number;
  opacityRate: number;
}
export type AnimationMetric = keyof Omit<IAnimationFrame, "timeMs">;
export interface IAnimationAnalysis {
  durationMs: number;
  frameMs: number;
  frames: IAnimationFrame[];
  impacts: { timeMs: number; strength: number }[];
  warnings: string[];
  width: number;
  height: number;
  layers: IAnimationMotionLayer[];
}
export interface IAnimationMotionLayer {
  weight: number;
  area: number;
  x: Float32Array;
  y: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  speed: Float32Array;
  scale: Float32Array;
  rotation: Float32Array;
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
export interface IAnimationGenerationOptions {
  smoothingMs: number;
  contrast?: number;
  gamma?: number;
  silenceFloor?: number;
  transientDuck?: number;
  envelopeHz?: number;
  maxPoints?: number;
  maxEvents?: number;
  strategyParams?: Partial<Record<IAnimationCandidate["id"], Record<string, number>>>;
}
export interface IAnimationAnalysisRequest {
  document: IAnimationDocument;
  frameMs: number;
  smoothingMs?: number;
}
export type AnimationAnalysisResponse = { analysis: IAnimationAnalysis } | { error: string };
