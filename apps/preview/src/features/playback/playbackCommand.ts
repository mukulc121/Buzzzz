interface IRivePlayback {
  paused: boolean;
  active: boolean;
}
export function playbackCommand(state: IRivePlayback): "pause" | "play" {
  return state.paused || !state.active ? "pause" : "play";
}
