import { useEffect } from "react";
import { AudioTrimControls } from "./AudioTrimControls";
import { SoundDialog } from "./SoundDialog";
import type { useAudioTrack } from "./useAudioTrack";

interface IAudioTrimDialog {
  audio: ReturnType<typeof useAudioTrack>;
  onClose: () => void;
}

export function AudioTrimDialog(props: IAudioTrimDialog) {
  const { audio, onClose } = props;
  const { stopPreview } = audio;
  useEffect(() => () => stopPreview(), [stopPreview]);
  return (
    <SoundDialog title="Audio trim" onClose={onClose}>
      <AudioTrimControls audio={audio} onClose={onClose} />
    </SoundDialog>
  );
}
