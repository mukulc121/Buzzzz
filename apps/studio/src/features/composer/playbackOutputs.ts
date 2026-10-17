interface IPlaybackOutputs {
  mode: "document" | "pattern";
  onPhone: boolean;
  phones: number;
  sound: boolean;
  audio: boolean;
  animation: boolean;
}

export function derivePlaybackOutputs(options: IPlaybackOutputs) {
  const { mode, onPhone, phones, sound, audio, animation } = options;
  const devices = mode === "pattern" || onPhone ? phones : 0;
  return {
    devices,
    sound: mode === "pattern" || (sound && !audio && !(animation && devices > 0)),
    opensDevicePanel: mode === "document" && onPhone && phones === 0,
  };
}
