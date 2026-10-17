interface IRivePlayback {
  paused: boolean;
  active: boolean;
  foreground: boolean;
}
export function playbackCommand(state: IRivePlayback): "pause" | "play" {
  return state.paused || !state.active || !state.foreground ? "pause" : "play";
}
