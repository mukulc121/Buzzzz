export type DemoId =
  | "audio"
  | "lottie"
  | "accelerometer"
  | "slider"
  | "buttons"
  | "countdown"
  | "balloon"
  | "dots"
  | "notification";

export const DEMOS: { id: DemoId; title: string; slug: string; headerTitle: string }[] = [
  { id: "audio", title: "Audio Sync", slug: "audio-demo", headerTitle: "Audio Haptics" },
  { id: "lottie", title: "Lottie", slug: "lottie-demo", headerTitle: "Lottie Haptics" },
  {
    id: "accelerometer",
    title: "Accelerometer",
    slug: "sensor-haptics-demo",
    headerTitle: "Accelerometer Haptics",
  },
  { id: "slider", title: "Slider", slug: "slider-demo", headerTitle: "Slider Demo" },
  { id: "buttons", title: "Buttons", slug: "buttons-demo", headerTitle: "Buttons Demo" },
  {
    id: "countdown",
    title: "Countdown timer",
    slug: "countdown-timer-demo",
    headerTitle: "Countdown Timer",
  },
  { id: "balloon", title: "Balloon", slug: "balloon-demo", headerTitle: "Balloon Demo" },
  { id: "dots", title: "Dot Loader", slug: "dot-loader-demo", headerTitle: "Dot Loader" },
  {
    id: "notification",
    title: "Notification",
    slug: "notification-haptics-demo",
    headerTitle: "Notification Haptics",
  },
];
