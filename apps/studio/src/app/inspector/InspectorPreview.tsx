import type { Studio } from "../useStudio";
import { InspectorSection } from "../../components/InspectorSection";
import { InspectorSwitch } from "./InspectorSwitch";

interface IInspectorPreview {
  studio: Studio;
}
export function InspectorPreview(props: IInspectorPreview) {
  const { playback, session, audio } = props.studio;
  return (
    <InspectorSection title="Preview">
      <p className="hint">What Play (top right) starts.</p>
      <div className="inspector-preview-switches">
        <InspectorSwitch
          label="Play on device"
          checked={playback.onPhone}
          disabled={!session.phones}
          description={
            !session.phones ? "Connect a phone in Device to preview haptics." : undefined
          }
          onChange={playback.setOnPhone}
        />
        <InspectorSwitch
          label="Haptics as sound"
          checked={playback.sound}
          onChange={playback.setSound}
        />
        <InspectorSwitch
          label="Audio track"
          checked={playback.trackEnabled}
          disabled={!audio.source}
          description={!audio.source ? "Add an audio track in Sound to preview it." : undefined}
          onChange={playback.setTrackEnabled}
        />
      </div>
    </InspectorSection>
  );
}
