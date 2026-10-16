export interface IMetricSeries {
  stepMs: number;
  values: Float32Array;
}
export interface IMetricParam {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  suffix?: string;
  precision: number;
}
export interface IMetric {
  id: string;
  label: string;
  description: string;
  color: string;
  scale: { full?: number; unit?: string; level?: boolean };
  params?: IMetricParam[];
  compute: (
    samples: Float32Array,
    sampleRate: number,
    frameMs: number,
    params: Record<string, number>,
  ) => IMetricSeries;
}
