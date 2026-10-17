import type { ReactNode } from "react";
import type { Theme } from "../../theme/colors";
import { AudioSyncDemo } from "./audio/AudioSyncDemo";
import { BalloonDemo } from "./balloon/BalloonDemo";
import type { DemoId } from "./catalog";
import { ButtonsDemo } from "./controls/ButtonsDemo";
import { SliderDemo } from "./controls/SliderDemo";
import { LottieDemo } from "./lottie/LottieDemo";
import { NotificationDemo } from "./notifications/NotificationDemo";
import { AccelerometerDemo } from "./sensors/AccelerometerDemo";
import { CountdownDemo } from "./timers/CountdownDemo";
import { DotLoaderDemo } from "./timers/DotLoaderDemo";
import { RiveDemo } from "./rive/RiveDemo";

const SCREENS: Record<DemoId, (props: { t: Theme }) => ReactNode> = {
  audio: AudioSyncDemo,
  lottie: LottieDemo,
  rive: RiveDemo,
  accelerometer: AccelerometerDemo,
  slider: SliderDemo,
  buttons: ButtonsDemo,
  countdown: CountdownDemo,
  balloon: BalloonDemo,
  dots: DotLoaderDemo,
  notification: NotificationDemo,
};

interface IDemoDetail {
  t: Theme;
  id: DemoId;
}
export function DemoDetail(props: IDemoDetail) {
  const { t, id } = props;
  const Screen = SCREENS[id];
  return <Screen t={t} />;
}
