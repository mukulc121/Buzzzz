import type { Msg } from "@buzzzz/core";

export function isReceivedResourceMessage(
  message: Msg,
): message is Extract<Msg, { type: "haptic-preset" | "audio-haptics" | "animation-haptics" }> {
  return (
    message.type === "haptic-preset" ||
    message.type === "audio-haptics" ||
    message.type === "animation-haptics"
  );
}

export function stopLegacyFromBrowser(
  owner: string | null,
  connectionId: string,
  stop: () => void,
): void {
  if (owner === connectionId) stop();
}
