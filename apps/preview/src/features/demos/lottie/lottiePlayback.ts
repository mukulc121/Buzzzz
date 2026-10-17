import type { Pattern, RealtimeComposer } from "react-native-pulsar";
import type { HapticLottieRef } from "react-native-pulsar-lottie";
import type { usePlaybackClock } from "../audio/usePlaybackClock";

interface ILottiePlayback {
  durationMs: number;
  pattern: Pattern;
}

interface ILottieSession {
  view: Pick<HapticLottieRef, "setTimestamp" | "pause" | "resume"> | null;
  clock: ReturnType<typeof usePlaybackClock>;
  realtime: Pick<RealtimeComposer, "set" | "stop">;
  onScrub: (timeMs: number | null) => void;
}

function envelopeValueAt(points: Pattern["continuousPattern"]["amplitude"], timeMs: number) {
  if (!points.length) return 0;
  if (timeMs <= points[0].time) return points[0].value;
  const last = points[points.length - 1];
  if (timeMs >= last.time) return last.value;
  for (let index = 1; index < points.length; index++) {
    const right = points[index];
    if (timeMs > right.time) continue;
    const left = points[index - 1];
    const span = right.time - left.time;
    return span <= 0
      ? right.value
      : left.value + ((right.value - left.value) * (timeMs - left.time)) / span;
  }
  return last.value;
}

export function createLottiePlayback(options: ILottiePlayback) {
  let session: ILottieSession | null = null;
  let active = true;
  let dragging = false;
  let wasRunning = false;
  const playFrom = (timeMs: number) => {
    session?.view?.setTimestamp(timeMs);
    session?.view?.resume();
    session?.clock.start(timeMs);
  };
  const pause = () => {
    session?.view?.pause();
    session?.clock.stop();
  };
  return {
    connect: (next: ILottieSession) => {
      session = next;
    },
    activate: () => {
      active = true;
    },
    toggle: () => {
      if (!active || !session) return;
      const clock = session.clock;
      if (clock.isRunning) pause();
      else playFrom(clock.positionMs >= options.durationMs ? 0 : clock.positionMs);
    },
    scrub: (timeMs: number | null) => {
      if (!active || !session) return;
      if (timeMs === null) {
        dragging = false;
        session.realtime.stop();
        session.onScrub(null);
        return;
      }
      if (!dragging) {
        dragging = true;
        wasRunning = session.clock.isRunning;
        pause();
      }
      session.onScrub(timeMs);
      session.view?.setTimestamp(timeMs);
      const { amplitude, frequency } = options.pattern.continuousPattern;
      session.realtime.set(envelopeValueAt(amplitude, timeMs), envelopeValueAt(frequency, timeMs));
    },
    seek: (timeMs: number) => {
      if (!active || !session) return;
      const resume = wasRunning || session.clock.isRunning;
      dragging = false;
      wasRunning = false;
      session.realtime.stop();
      if (resume) playFrom(timeMs);
      else {
        session.view?.setTimestamp(timeMs);
        session.clock.jumpTo(timeMs);
      }
    },
    dispose: () => {
      active = false;
      dragging = false;
      wasRunning = false;
      session?.view?.pause();
      session?.realtime.stop();
      session = null;
    },
  };
}
