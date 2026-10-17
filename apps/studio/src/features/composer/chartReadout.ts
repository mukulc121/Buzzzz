export function chartReadout(text: string, center: number, canvasWidth: number) {
  const width = text.length * 6.2 + 10;
  return { width, left: Math.max(0, Math.min(center - width / 2, canvasWidth - width)) };
}
