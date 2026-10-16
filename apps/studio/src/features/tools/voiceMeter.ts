export function monitorVoice(
  input: MediaStream,
  onLevel: (level: number, elapsedMs: number) => void,
) {
  const context = new AudioContext();
  const source = context.createMediaStreamSource(input);
  const analyzer = context.createAnalyser();
  analyzer.fftSize = 512;
  source.connect(analyzer);
  const samples = new Float32Array(analyzer.fftSize);
  const start = performance.now();
  let previous = 0;
  let frame = 0;
  let active = true;
  const update = (now: number) => {
    if (!active) return;
    if (now - previous >= 100) {
      analyzer.getFloatTimeDomainData(samples);
      const rms = Math.sqrt(samples.reduce((sum, sample) => sum + sample ** 2, 0) / samples.length);
      onLevel(Math.min(1, rms * 4), now - start);
      previous = now;
    }
    frame = requestAnimationFrame(update);
  };
  frame = requestAnimationFrame(update);
  void context.resume().catch(() => {});
  return () => {
    active = false;
    cancelAnimationFrame(frame);
    source.disconnect();
    analyzer.disconnect();
    void context.close().catch(() => {});
  };
}
