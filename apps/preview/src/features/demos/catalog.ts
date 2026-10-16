export type DemoId =
  | "audio"
  | "lottie"
  | "accelerometer"
  | "slider"
  | "buttons"
  | "countdown"
  | "balloon"
  | "dots";

export const DEMOS: { id: DemoId; title: string; blurb: string }[] = [
  { id: "audio", title: "Audio Sync", blurb: "A beat with taps on every hit" },
  { id: "lottie", title: "Lottie", blurb: "Haptics on animation keyframes" },
  { id: "accelerometer", title: "Accelerometer", blurb: "Tilt and shake to feel it" },
  { id: "slider", title: "Slider", blurb: "Clicks on every step" },
  { id: "buttons", title: "Buttons", blurb: "System, preset and custom taps" },
  { id: "countdown", title: "Countdown", blurb: "Ticks that build to zero" },
  { id: "balloon", title: "Balloon", blurb: "Hold to inflate, then pop" },
  { id: "dots", title: "Dot Loader", blurb: "A loop you can feel" },
];
