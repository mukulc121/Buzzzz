interface IChartViewport {
  width: number;
  height: number;
  startMs: number;
  durationMs: number;
}

export function chartGeometry(viewport: IChartViewport) {
  const { width, height, startMs, durationMs } = viewport;
  const left = 46;
  const top = 18;
  const right = Math.max(left, width - 18);
  const bottom = Math.max(top, height - 30);
  const axisLeft = left + 14;
  const axisWidth = Math.max(1, right - left - 28);
  const plotHeight = Math.max(1, bottom - top);
  return {
    ...viewport,
    left,
    top,
    right,
    bottom,
    plotWidth: right - left,
    plotHeight,
    axisLeft,
    axisWidth,
    x: (time: number) => axisLeft + ((time - startMs) / durationMs) * axisWidth,
    y: (value: number) => top + (1 - value) * plotHeight,
    timeAtX: (x: number) => startMs + ((x - axisLeft) / axisWidth) * durationMs,
    valueAtY: (y: number) => 1 - (y - top) / plotHeight,
    inView: (time: number) => time >= startMs && time <= startMs + durationMs,
    containsPlot: (x: number, y: number) => x >= left && x <= right && y >= top && y <= bottom,
  };
}

export type IChartGeometry = ReturnType<typeof chartGeometry>;
