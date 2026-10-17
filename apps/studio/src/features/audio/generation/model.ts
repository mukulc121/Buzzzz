import type { Pattern } from "@buzzzz/core";
import type { IAudioClip } from "../model";

export type CurvePoint = Pattern["continuousPattern"]["amplitude"][number];
export interface IPulsarEvent {
  time: number;
  intensity: number;
  frequency: number;
}
export interface IPulsarPattern {
  intensity: CurvePoint[];
  frequency: CurvePoint[];
  discrete: IPulsarEvent[];
}
export interface IGenerationOptions {
  envelopeHz: number;
  maxPoints: number;
  maxEvents: number;
  silenceFloor: number;
  gamma: number;
  transientDuck: number;
  contrast: number;
}
export interface IStrategyParam {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  suffix?: string;
  precision?: number;
}
export type StrategyParams = Record<string, Record<string, number>>;
export interface IStrategy {
  id: string;
  name: string;
  summary: string;
  detail: string;
  params: IStrategyParam[];
  generate: (
    clip: IAudioClip,
    options: IGenerationOptions,
    params?: Record<string, number>,
  ) => IPulsarPattern;
}
export interface IStrategyResult {
  strategyId: string;
  name: string;
  summary: string;
  detail: string;
  pattern: IPulsarPattern;
  elapsedMs: number;
  error?: string;
}
export interface IGenerationRequest {
  requestId: number;
  channels: Float32Array[];
  sampleRate: number;
  options?: IGenerationOptions;
  strategyParams?: StrategyParams;
}
export type GenerationResponse =
  | { requestId: number; ok: true; results: IStrategyResult[]; durationMs: number }
  | { requestId: number; ok: false; error: string };

export const empty = (): IPulsarPattern => ({ intensity: [], frequency: [], discrete: [] });
