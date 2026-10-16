import type { AnimationMetric } from "./model";
import type { useAnimationTrack } from "./useAnimationTrack";

interface IAnimationChannelControls {
  animation: ReturnType<typeof useAnimationTrack>;
}
const channels: { id: AnimationMetric; label: string }[] = [
  { id: "energy", label: "Motion energy" },
  { id: "velocity", label: "Velocity" },
  { id: "acceleration", label: "Acceleration" },
  { id: "directionChange", label: "Direction change" },
  { id: "positionX", label: "X position" },
  { id: "positionY", label: "Y position" },
  { id: "scale", label: "Scale" },
  { id: "rotation", label: "Rotation" },
  { id: "opacity", label: "Opacity" },
];

export function AnimationChannelControls(props: IAnimationChannelControls) {
  const { animation } = props;
  return (
    <details className="audio-settings">
      <summary>Channel mapping</summary>
      <div className="audio-settings-grid">
        <label className="field">
          Intensity channel
          <select
            value={animation.intensityChannel}
            onChange={(event) => {
              const selected = channels.find((channel) => channel.id === event.currentTarget.value);
              if (selected) animation.setIntensityChannel(selected.id);
            }}
          >
            {channels.map((channel) => (
              <option key={channel.id} value={channel.id}>
                {channel.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Frequency channel
          <select
            value={animation.frequencyChannel}
            onChange={(event) => {
              const selected = channels.find((channel) => channel.id === event.currentTarget.value);
              if (selected) animation.setFrequencyChannel(selected.id);
            }}
          >
            {channels.map((channel) => (
              <option key={channel.id} value={channel.id}>
                {channel.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </details>
  );
}
