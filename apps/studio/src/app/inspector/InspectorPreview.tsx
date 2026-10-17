import type { Studio } from "../useStudio";
import { InspectorSection } from "../../components/InspectorSection";
import { InspectorSwitch } from "./InspectorSwitch";

interface IInspectorPreview {
  studio: Studio;
}
export function InspectorPreview(props: IInspectorPreview) {
  const { playback, session, audio, animation } = props.studio;
  const soundBlockedBy =
    audio.source && playback.trackEnabled
      ? "the audio track is playing"
      : animation.source && session.phones && playback.onPhone
        ? "a phone is playing the haptics"
        : null;
  return (
    <InspectorSection title="Preview">
      <p className="hint">What Play (top right) starts.</p>
      <div className="inspector-preview-switches">
        <InspectorSwitch
          label="Play on device"
          checked={playback.onPhone}
          info="Sends the pattern to every connected phone. With no phone connected, the Device panel opens so you can pair one."
          onChange={playback.setOnPhone}
        />
        <InspectorSwitch
          label="Haptics as sound"
          info={
            soundBlockedBy
              ? `Not while ${soundBlockedBy} - it would play over it. An impression of the haptics through your speakers, for when there's no phone to hand.`
              : "An impression of the haptics through your speakers, for when there's no phone to hand. A playing audio track takes its place - switch it off to hear the haptics instead; so does an animation, while a phone is playing the haptics."
          }
          disabled={Boolean(soundBlockedBy)}
          checked={playback.sound && !soundBlockedBy}
          onChange={playback.setSound}
        />
        <InspectorSwitch
          label="Audio track"
          checked={playback.trackEnabled}
          info="Plays the preset's attached audio file, over the same range as the haptics."
          onChange={playback.setTrackEnabled}
        />
      </div>
    </InspectorSection>
  );
}
