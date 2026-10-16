function particleColor(value: string) {
  const channels = value.match(/\d+(?:\.\d+)?/g)?.slice(0, 3);
  return channels?.length === 3
    ? `#${channels.map((channel) => Math.round(Number(channel)).toString(16).padStart(2, "0")).join("")}`
    : null;
}

export async function celebrateWalkthroughs() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const { default: confetti } = await import("canvas-confetti");
  const theme = getComputedStyle(document.documentElement);
  const options = {
    origin: { x: 0.88, y: 0.86 },
    colors: ["--accent", "--primary-bg", "--learn-celebration", "--fg-2"]
      .map((name) => particleColor(theme.getPropertyValue(name)))
      .filter((color): color is string => color !== null),
    zIndex: 950,
    disableForReducedMotion: true,
  };
  void confetti({ ...options, particleCount: 90, spread: 70, startVelocity: 45 });
  window.setTimeout(() => {
    void confetti({ ...options, particleCount: 50, spread: 110, startVelocity: 30, decay: 0.92 });
  }, 150);
}
